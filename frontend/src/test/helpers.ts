import type {
  ChangeEvent,
  FormEvent,
  MouseEvent,
  SyntheticEvent,
} from "react";
import type { AuthFetchFn } from "../services/especiallyLikedApi";

/** Vitest fetch mocks are partial `Response` shapes; cast at the boundary. */
export function asAuthFetch(mock: unknown): AuthFetchFn {
  return mock as AuthFetchFn;
}

export function fakeFormEvent(): FormEvent<Element> {
  return { preventDefault: () => {} } as unknown as FormEvent<Element>;
}

export function fakeSyntheticEvent(): SyntheticEvent<Element> {
  return { preventDefault: () => {} } as unknown as SyntheticEvent<Element>;
}

/** Minimal stub for `handleTrackRowClick` tests */
export function fakeMouseEventPartial(
  partial: Pick<MouseEvent<Element>, "target" | "currentTarget" | "clientX"> &
    Partial<MouseEvent<Element>>,
): MouseEvent<Element> {
  return partial as unknown as MouseEvent<Element>;
}

/** Minimal `ChangeEvent<HTMLSelectElement>` for hook tests */
export function fakeSelectChange(value: string): ChangeEvent<HTMLSelectElement> {
  return { target: { value } } as unknown as ChangeEvent<HTMLSelectElement>;
}
