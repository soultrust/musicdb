import { useListModalContext } from "../hooks/useMusicDbApp";

export default function ListModal() {
  const l = useListModalContext();
  return (
    <div className="modal-overlay" onClick={l.handleCloseListModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Lists</h2>
          <button className="modal-close" onClick={l.handleCloseListModal}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {l.listLoading ? (
            <p className="detail-loading">Loading lists…</p>
          ) : (
            <>
              {l.lists.length > 0 && (
                <div className="lists-checkbox-group">
                  <p className="lists-label">Select lists:</p>
                  {l.lists.map((list) => (
                    <label key={list.id} className="list-checkbox">
                      <input
                        type="checkbox"
                        checked={l.selectedListIds.includes(list.id)}
                        onChange={() => l.toggleListSelection(list.id)}
                        disabled={l.listLoading}
                      />
                      <span className="list-checkbox-box" />
                      <span className="list-checkbox-label">{list.name}</span>
                    </label>
                  ))}
                </div>
              )}
              <form onSubmit={l.handleCreateList} className="create-list-form">
                <label htmlFor="new-list-name">Create a new list</label>
                <div className="create-list-input-group">
                  <input
                    id="new-list-name"
                    type="text"
                    value={l.newListName}
                    onChange={(e) => l.setNewListName(e.target.value)}
                    placeholder="List name"
                    disabled={l.listLoading}
                  />
                  <button type="submit" disabled={l.listLoading || !l.newListName.trim()}>
                    Create
                  </button>
                </div>
              </form>
              {l.listError && <p className="error">{l.listError}</p>}
              <div className="modal-actions">
                <button
                  onClick={l.handleAddToLists}
                  disabled={l.listLoading}
                  className="add-to-lists-btn"
                >
                  {l.listLoading
                    ? "Updating…"
                    : l.selectedListIds.length === 0
                      ? "Remove from all lists"
                      : `Update ${l.selectedListIds.length} list${l.selectedListIds.length !== 1 ? "s" : ""}`}
                </button>
                <button onClick={l.handleCloseListModal} className="modal-cancel-btn">
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
