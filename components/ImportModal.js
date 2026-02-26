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

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setResult(null);
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
      toast.success(res.data.message);
      onImported();
      onClose();
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

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
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
              <span style={{ color: "var(--text)" }}>{t.import_phone_col}</span>{" "}
              {t.import_optional} ·{" "}
              <span style={{ color: "var(--text)" }}>{t.import_email_col}</span>{" "}
              {t.import_optional}
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

          {result && !result.error && (
            <div className="checkin-result success">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                width={18}
                height={18}
                strokeWidth={2}
                style={{
                  color: "var(--success)",
                  flexShrink: 0,
                  marginTop: "1px",
                }}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--success)",
                  }}
                >
                  {t.import_success}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginTop: "3px",
                  }}
                >
                  {t.import_result(result.imported, result.skipped)}
                </div>
              </div>
            </div>
          )}

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
        <div className="modal-footer">
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
        </div>
      </div>
    </div>
  );
}
