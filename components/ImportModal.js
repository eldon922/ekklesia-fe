import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { attendeesApi } from "../lib/api";
import { useLang } from "../contexts/LangContext";
import toast from "react-hot-toast";

export default function ImportModal({ eventId, onClose, onImported }) {
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [selectedDuplicates, setSelectedDuplicates] = useState(new Set());
  const [mode, setMode] = useState("initial"); // initial or duplicates

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setResult(null);
      setDuplicates([]);
      setMode("initial");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    maxFiles: 1,
  });

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await attendeesApi.import(eventId, file);
      setResult(res.data);

      if (res.data.duplicates && res.data.duplicates.length > 0) {
        setDuplicates(res.data.duplicates);
        setMode("duplicates");
        toast.success(
          `${res.data.imported} imported. ${res.data.duplicates.length} duplicates found.`,
        );
      } else {
        toast.success(res.data.message);
        onImported();
        onClose();
      }
    } catch (err) {
      const msg = err.response?.data?.message || t.toast_error_generic;
      toast.error(msg);
      if (err.response?.data?.detected_columns) {
        setResult({
          error: msg,
          detected_columns: err.response.data.detected_columns,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDuplicate = (idx) => {
    const newSelected = new Set(selectedDuplicates);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelectedDuplicates(newSelected);
  };

  const handleSelectAllDuplicates = () => {
    if (selectedDuplicates.size === duplicates.length) {
      setSelectedDuplicates(new Set());
    } else {
      setSelectedDuplicates(new Set(duplicates.map((_, i) => i)));
    }
  };

  const handleImportDuplicates = async () => {
    if (selectedDuplicates.size === 0) {
      toast.error("Select at least one duplicate to import");
      return;
    }

    setLoading(true);
    try {
      const toImport = duplicates.filter((_, i) => selectedDuplicates.has(i));
      const res = await attendeesApi.importDuplicates(eventId, toImport);
      toast.success(res.data.message);
      onImported();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || t.toast_error_generic);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) =>
        e.target === e.currentTarget &&
        (mode !== "duplicates" ? onClose() : null)
      }
    >
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{t.import_title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              width={16}
              height={16}
              strokeWidth={2}
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {mode === "initial" && (
          <div className="modal-body">
            <div
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "12px 14px",
                marginBottom: "16px",
              }}
            >
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                }}
              >
                {t.import_instruction}
                <br />
                <span style={{ color: "var(--danger)" }}>
                  {t.import_name_col}
                </span>{" "}
                {t.import_required} ·{" "}
                <span style={{ color: "var(--text)" }}>
                  {t.import_phone_col}
                </span>{" "}
                {t.import_optional} ·{" "}
                <span style={{ color: "var(--text)" }}>
                  {t.import_email_col}
                </span>{" "}
                {t.import_optional} ·{" "}
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                    fontSize: "11px",
                  }}
                >
                  (kolom: &quot;Gereja Asal&quot;, &quot;Gereja&quot;, atau
                  &quot;Email&quot;)
                </span>
              </p>
            </div>

            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? "active" : ""}`}
              style={{ marginBottom: "16px" }}
            >
              <input {...getInputProps()} />
              <svg
                className="dropzone-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              {file ? (
                <>
                  <p className="dropzone-text" style={{ color: "var(--text)" }}>
                    {file.name}
                  </p>
                  <p className="dropzone-hint">
                    {(file.size / 1024).toFixed(1)} KB — {t.import_click_change}
                  </p>
                </>
              ) : (
                <>
                  <p className="dropzone-text">
                    {isDragActive ? t.import_drop_active : t.import_drop}
                  </p>
                  <p className="dropzone-hint">{t.import_supported}</p>
                </>
              )}
            </div>

            {result?.error && (
              <div className="checkin-result error">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  width={18}
                  height={18}
                  strokeWidth={2}
                  style={{
                    color: "var(--danger)",
                    flexShrink: 0,
                    marginTop: "1px",
                  }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--danger)",
                    }}
                  >
                    {result.error}
                  </div>
                  {result.detected_columns && (
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        marginTop: "4px",
                      }}
                    >
                      Columns: {result.detected_columns.join(", ")}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {mode === "duplicates" && (
          <div className="modal-body">
            <div
              style={{
                background: "var(--warning-dim)",
                border: "1px solid rgba(234,179,8,0.3)",
                borderRadius: "var(--radius)",
                padding: "12px 14px",
                marginBottom: "16px",
                display: "flex",
                gap: "10px",
              }}
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                width={18}
                height={18}
                strokeWidth={2}
                style={{
                  color: "var(--warning)",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--text)",
                    fontWeight: 600,
                    marginBottom: "4px",
                  }}
                >
                  {duplicates.length} duplicate
                  {duplicates.length !== 1 ? "s" : ""} found
                </p>
                <p
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    lineHeight: 1.5,
                  }}
                >
                  These names or phone numbers already exist. Choose which ones
                  to import.
                </p>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
                paddingBottom: "12px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedDuplicates.size === duplicates.length}
                  onChange={handleSelectAllDuplicates}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ fontSize: "13px", fontWeight: 600 }}>
                  {selectedDuplicates.size === duplicates.length
                    ? "Deselect All"
                    : `Select All (${selectedDuplicates.size}/${duplicates.length})`}
                </span>
              </label>
            </div>

            <div
              style={{
                maxHeight: "300px",
                overflowY: "auto",
                marginBottom: "16px",
              }}
            >
              {duplicates.map((dup, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "12px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    gap: "10px",
                    alignItems: "flex-start",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedDuplicates.has(idx)}
                    onChange={() => handleToggleDuplicate(idx)}
                    style={{ marginTop: "3px", cursor: "pointer" }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "var(--text)",
                        marginBottom: "6px",
                      }}
                    >
                      {dup.name}
                    </p>
                    {dup.phone && (
                      <p
                        style={{
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          marginBottom: "2px",
                        }}
                      >
                        📱 {dup.phone}
                      </p>
                    )}
                    {dup.email && (
                      <p
                        style={{
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          marginBottom: "4px",
                        }}
                      >
                        ✉️ {dup.email}
                      </p>
                    )}
                    {dup.matchedBy && (
                      <div
                        style={{
                          padding: "8px",
                          background: "var(--bg-elevated)",
                          borderLeft: "3px solid var(--warning)",
                          borderRadius: "2px",
                          marginTop: "6px",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "11px",
                            color: "var(--warning)",
                            fontWeight: 600,
                            margin: "0 0 3px 0",
                          }}
                        >
                          Matched by {dup.matchedBy.toUpperCase()}
                        </p>
                        {dup.matchedBy === "phone" && (
                          <>
                            <p
                              style={{
                                fontSize: "11px",
                                color: "var(--text)",
                                margin: "2px 0",
                              }}
                            >
                              Existing:{" "}
                              <strong>{dup.existingPhone || "—"}</strong>
                            </p>
                            {dup.existingName && (
                              <p
                                style={{
                                  fontSize: "11px",
                                  color: "var(--text-muted)",
                                  margin: "2px 0",
                                }}
                              >
                                Name: {dup.existingName}
                              </p>
                            )}
                          </>
                        )}
                        {dup.matchedBy === "name" && (
                          <>
                            <p
                              style={{
                                fontSize: "11px",
                                color: "var(--text)",
                                margin: "2px 0",
                              }}
                            >
                              Existing:{" "}
                              <strong>{dup.existingName || "—"}</strong>
                            </p>
                            {dup.existingPhone && (
                              <p
                                style={{
                                  fontSize: "11px",
                                  color: "var(--text-muted)",
                                  margin: "2px 0",
                                }}
                              >
                                Phone: {dup.existingPhone}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-footer">
          {mode === "initial" && (
            <>
              <button className="btn btn-secondary" onClick={onClose}>
                {t.import_close}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleImport}
                disabled={!file || loading}
              >
                {loading ? t.import_importing : t.import_btn}
              </button>
            </>
          )}

          {mode === "duplicates" && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  onImported();
                  onClose();
                }}
              >
                Skip Duplicates
              </button>
              <button
                className="btn btn-primary"
                onClick={handleImportDuplicates}
                disabled={selectedDuplicates.size === 0 || loading}
              >
                {loading
                  ? "Importing..."
                  : `Import Selected (${selectedDuplicates.size})`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
