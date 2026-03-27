from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import List, ListItem
from ..serializers import ListCreateSerializer, ListItemsWriteSerializer
from .common import (
    _bad_request,
    _fetch_display_title_from_discogs,
    _internal_error_response,
    logger,
    _validate_choice,
    _validate_required,
    _validation_error_response,
)


class ListsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            qs = List.objects.filter(user=request.user).order_by("-updated_at")
            list_type = (request.query_params.get("list_type") or "").strip().lower()
            if list_type in ("release", "person"):
                qs = qs.filter(list_type=list_type)
            lists_data = [
                {
                    "id": lst.id,
                    "list_type": lst.list_type,
                    "name": lst.name,
                    "created_at": lst.created_at.isoformat() if lst.created_at else None,
                    "updated_at": lst.updated_at.isoformat() if lst.updated_at else None,
                }
                for lst in qs
            ]
            return Response({"lists": lists_data})
        except Exception as e:
            logger.exception("Failed to load lists for user %s", request.user.id)
            return _internal_error_response("Failed to load lists", e)

    def post(self, request):
        try:
            ser = ListCreateSerializer(data=request.data)
            if not ser.is_valid():
                return _validation_error_response(ser)
            name = ser.validated_data["name"]
            list_type = ser.validated_data["list_type"]
            if List.objects.filter(user=request.user, list_type=list_type, name=name).exists():
                return _bad_request("A list with this name already exists for this type")
            list_obj = List.objects.create(user=request.user, list_type=list_type, name=name)
            return Response(
                {
                    "id": list_obj.id,
                    "list_type": list_obj.list_type,
                    "name": list_obj.name,
                    "created_at": list_obj.created_at.isoformat() if list_obj.created_at else None,
                    "updated_at": list_obj.updated_at.isoformat() if list_obj.updated_at else None,
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            logger.exception("Failed to create list for user %s", request.user.id)
            return _internal_error_response("Failed to create list", e)


class ListItemsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            ser = ListItemsWriteSerializer(data=request.data)
            if not ser.is_valid():
                return _validation_error_response(ser)
            resource_type = ser.validated_data["type"]
            resource_id = str(ser.validated_data["id"]).strip()
            list_ids = ser.validated_data["list_ids"]
            title = str(ser.validated_data.get("title") or "").strip()

            selected_list_ids_set = set(list_ids)
            user_release_lists = List.objects.filter(user=request.user, list_type=List.LIST_TYPE_RELEASE)
            if selected_list_ids_set:
                valid_list_ids = set(user_release_lists.values_list("id", flat=True))
                invalid_ids = selected_list_ids_set - valid_list_ids
                if invalid_ids:
                    return _bad_request(
                        f"One or more lists not found or are not album lists: {invalid_ids}"
                    )

            if not title:
                if resource_type == "album":
                    title = f"album-{resource_id}"
                else:
                    title = _fetch_display_title_from_discogs(resource_type, resource_id)

            current_list_items = ListItem.objects.filter(
                list__user=request.user,
                list__list_type=List.LIST_TYPE_RELEASE,
                type=resource_type,
                discogs_id=str(resource_id),
            ).select_related("list")
            current_list_ids_set = {item.list_id for item in current_list_items}
            lists_to_add = selected_list_ids_set - current_list_ids_set
            lists_to_remove = current_list_ids_set - selected_list_ids_set
            added_to = []
            removed_from = []

            if lists_to_add:
                for list_obj in user_release_lists.filter(id__in=lists_to_add):
                    item, created = ListItem.objects.get_or_create(
                        list=list_obj,
                        type=resource_type,
                        discogs_id=str(resource_id),
                        defaults={"title": title},
                    )
                    if created:
                        added_to.append(list_obj.id)
                    elif not item.title and title:
                        item.title = title
                        item.save()

            if lists_to_remove:
                items_to_delete = current_list_items.filter(list_id__in=lists_to_remove)
                removed_from = list(items_to_delete.values_list("list_id", flat=True))
                items_to_delete.delete()

            if selected_list_ids_set:
                items_to_update = ListItem.objects.filter(
                    list__user=request.user,
                    list_id__in=selected_list_ids_set,
                    type=resource_type,
                    discogs_id=str(resource_id),
                )
                for item in items_to_update:
                    if not item.title and title:
                        item.title = title
                        item.save()

            message_parts = []
            if added_to:
                message_parts.append(f"Added to {len(added_to)} list(s)")
            if removed_from:
                message_parts.append(f"Removed from {len(removed_from)} list(s)")
            if not message_parts:
                message_parts.append("No changes made")
            return Response(
                {"added_to": added_to, "removed_from": removed_from, "message": "; ".join(message_parts)}
            )
        except Exception as e:
            logger.exception("Failed to update lists for user %s", request.user.id)
            return _internal_error_response("Failed to update lists", e)


class ListItemsCheckView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        resource_type = request.query_params.get("type", "").strip().lower()
        resource_id = request.query_params.get("id", "").strip()
        required_error = _validate_required({"type": resource_type, "id": resource_id})
        if required_error:
            return _bad_request("Missing required parameters: type and id")
        type_error = _validate_choice(resource_type, ("release", "master", "album"), "type")
        if type_error:
            return type_error
        list_ids = ListItem.objects.filter(
            list__user=request.user, type=resource_type, discogs_id=str(resource_id)
        ).values_list("list_id", flat=True)
        return Response({"list_ids": list(list_ids)})


class ListDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, list_id):
        list_obj = List.objects.filter(user=request.user, id=list_id).first()
        if not list_obj:
            return Response({"error": "List not found"}, status=status.HTTP_404_NOT_FOUND)
        items = [
            {"type": item.type, "id": item.discogs_id, "title": item.title or f"{item.type}-{item.discogs_id}"}
            for item in list_obj.items.all()
        ]
        return Response(
            {"id": list_obj.id, "list_type": list_obj.list_type, "name": list_obj.name, "items": items}
        )
