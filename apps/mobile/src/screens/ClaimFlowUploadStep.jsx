import { useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  FolderUp,
  Plus,
  ScrollText,
  Stethoscope,
  X,
  File,
} from 'lucide-react';
import ClaimFlowSteps from './ClaimFlowSteps.jsx';
import {
  createLocalFileId,
  formatFileSize,
  totalClaimFiles,
  validateClaimFile,
} from '../claimDraftUtils.js';

const UPLOAD_CATEGORIES = [
  {
    key: 'accidentPhotos',
    title: 'Accident photos',
    subtitle: 'Vehicle, scene, or injury photos',
    icon: Camera,
  },
  {
    key: 'medicalDocuments',
    title: 'Hospital or clinic document',
    subtitle: 'Medical note, receipt, or treatment record',
    icon: Stethoscope,
  },
  {
    key: 'policeReports',
    title: 'Police report',
    subtitle: 'Upload if available',
    icon: ScrollText,
  },
];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function simulateLocalUpload(onProgress) {
  return new Promise((resolve) => {
    let progress = 0;
    const tick = () => {
      progress += 28;
      onProgress(Math.min(progress, 100));
      if (progress >= 100) {
        resolve();
        return;
      }
      setTimeout(tick, 120);
    };
    tick();
  });
}

function fileStatusLabel(categoryKey, file) {
  if (file.status === 'uploading') return 'Uploading…';
  if (file.status === 'failed') return 'Upload failed. Try again.';
  if (categoryKey === 'policeReports') return 'Pending review';
  return null;
}

export default function ClaimFlowUploadStep({
  documents = { accidentPhotos: [], medicalDocuments: [], policeReports: [] },
  onDocumentsChange,
  onBack,
  onNext,
  onUploadLater,
}) {
  const inputRefs = useRef({});
  const [categoryErrors, setCategoryErrors] = useState({});
  const [uploading, setUploading] = useState(false);

  const fileCount = totalClaimFiles(documents);
  const canProceed = fileCount > 0 && !uploading;

  const updateCategory = (categoryKey, updater) => {
    onDocumentsChange?.((prev) => ({
      ...prev,
      [categoryKey]: updater(prev?.[categoryKey] || []),
    }));
  };

  const handlePickFile = (categoryKey) => {
    inputRefs.current[categoryKey]?.click();
  };

  const handleFileInput = async (categoryKey, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const validationError = validateClaimFile(file);
    if (validationError) {
      setCategoryErrors((prev) => ({ ...prev, [categoryKey]: validationError }));
      return;
    }

    setCategoryErrors((prev) => ({ ...prev, [categoryKey]: '' }));

    const fileId = createLocalFileId();
    const pendingFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      progress: 0,
      dataUrl: null,
    };

    updateCategory(categoryKey, () => [pendingFile]);
    setUploading(true);

    try {
      await simulateLocalUpload((progress) => {
        updateCategory(categoryKey, (files) =>
          files.map((entry) => (entry.id === fileId ? { ...entry, progress } : entry))
        );
      });

      const dataUrl = await readFileAsDataUrl(file);

      updateCategory(categoryKey, (files) =>
        files.map((entry) =>
          entry.id === fileId
            ? { ...entry, status: 'ready', progress: 100, dataUrl }
            : entry
        )
      );
    } catch {
      updateCategory(categoryKey, (files) =>
        files.map((entry) =>
          entry.id === fileId ? { ...entry, status: 'failed', progress: 0 } : entry
        )
      );
      setCategoryErrors((prev) => ({
        ...prev,
        [categoryKey]: 'Upload failed. Try again.',
      }));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (categoryKey, fileId) => {
    updateCategory(categoryKey, (files) => files.filter((entry) => entry.id !== fileId));
    setCategoryErrors((prev) => ({ ...prev, [categoryKey]: '' }));
  };

  const handleRetry = (categoryKey, fileId) => {
    updateCategory(categoryKey, (files) => files.filter((entry) => entry.id !== fileId));
    handlePickFile(categoryKey);
  };

  return (
    <main className="screen claim-flow-screen claim-flow-screen--upload">
      <header className="claim-flow-screen__header">
        <button type="button" className="claim-flow-screen__back" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={20} strokeWidth={2.25} />
        </button>
        <h1 className="claim-flow-screen__header-title">Upload Documents</h1>
        <span className="claim-flow-screen__header-spacer" aria-hidden="true" />
      </header>

      <ClaimFlowSteps currentStep={2} />

      <section className="claim-flow-screen__intro">
        <h2 className="claim-flow-screen__heading">Upload evidence</h2>
        <p className="claim-flow-screen__subheading">
          Attach photos or documents that support your accident claim.
        </p>
      </section>

      <article className="claim-flow-upload-card">
        <div className="claim-flow-upload-card__head">
          <div className="claim-flow-upload-card__icon" aria-hidden="true">
            <FolderUp size={22} strokeWidth={2} color="#007A3D" />
          </div>
          <div className="claim-flow-upload-card__titles">
            <h3 className="claim-flow-upload-card__title">Claim documents</h3>
            <p className="claim-flow-upload-card__hint">Photos, hospital notes, receipts, or police report.</p>
          </div>
        </div>

        <div className="claim-flow-upload-card__options">
          {UPLOAD_CATEGORIES.map((category) => {
            const Icon = category.icon;
            const files = documents[category.key] || [];
            const error = categoryErrors[category.key];

            return (
              <div key={category.key} className="claim-flow-upload-option-wrap">
                <input
                  ref={(node) => {
                    inputRefs.current[category.key] = node;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  className="claim-flow-upload-option__input"
                  aria-hidden="true"
                  tabIndex={-1}
                  onChange={(event) => handleFileInput(category.key, event)}
                />

                {files.length === 0 ? (
                  <button
                    type="button"
                    className="claim-flow-upload-option"
                    onClick={() => handlePickFile(category.key)}
                    disabled={uploading}
                  >
                    <span className="claim-flow-upload-option__icon" aria-hidden="true">
                      <Icon size={20} strokeWidth={2} color="#007A3D" />
                    </span>
                    <span className="claim-flow-upload-option__text">
                      <span className="claim-flow-upload-option__title">{category.title}</span>
                      <span className="claim-flow-upload-option__subtitle">{category.subtitle}</span>
                    </span>
                    <Plus size={20} strokeWidth={2.25} color="#007A3D" aria-hidden="true" />
                  </button>
                ) : (
                  <div className="claim-flow-upload-option claim-flow-upload-option--filled">
                    <span className="claim-flow-upload-option__icon" aria-hidden="true">
                      <Icon size={20} strokeWidth={2} color="#007A3D" />
                    </span>
                    <div className="claim-flow-upload-option__files">
                      {files.map((file) => {
                        const statusLabel = fileStatusLabel(category.key, file);
                        return (
                          <div key={file.id} className="claim-flow-file-row">
                            <File size={18} strokeWidth={2} color="#007A3D" aria-hidden="true" />
                            <div className="claim-flow-file-row__meta">
                              <span className="claim-flow-file-row__name">{file.name}</span>
                              <span className="claim-flow-file-row__size">
                                {file.status === 'uploading'
                                  ? 'Uploading…'
                                  : file.status === 'failed'
                                    ? 'Upload failed. Try again.'
                                    : `${formatFileSize(file.size)}${statusLabel ? ` · ${statusLabel}` : ''}`}
                              </span>
                              {file.status === 'uploading' && (
                                <span className="claim-flow-file-row__progress" aria-hidden="true">
                                  <span
                                    className="claim-flow-file-row__progress-fill"
                                    style={{ width: `${file.progress || 0}%` }}
                                  />
                                </span>
                              )}
                              {category.key === 'policeReports' && file.status === 'ready' && (
                                <span className="claim-flow-file-row__note">Police report uploaded</span>
                              )}
                            </div>
                            {file.status === 'failed' ? (
                              <button
                                type="button"
                                className="claim-flow-file-row__retry"
                                onClick={() => handleRetry(category.key, file.id)}
                              >
                                Retry
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="claim-flow-file-row__remove"
                                onClick={() => handleRemoveFile(category.key, file.id)}
                                aria-label={`Remove ${file.name}`}
                                disabled={file.status === 'uploading'}
                              >
                                <X size={16} strokeWidth={2.25} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {error && (
                  <p className="claim-flow-upload-option__error" role="alert">
                    {error}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </article>

      <p className="claim-flow-upload-hint">
        You can still submit basic claim details, but evidence helps review.
      </p>

      <button
        type="button"
        className="claim-flow-screen__next"
        disabled={!canProceed}
        onClick={onNext}
      >
        <span>Next: Review Claim</span>
        <ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />
      </button>

      <button type="button" className="claim-flow-screen__secondary" onClick={onUploadLater}>
        I&apos;ll upload later
      </button>
    </main>
  );
}
