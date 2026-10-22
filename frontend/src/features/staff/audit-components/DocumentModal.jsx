import React from 'react';
import { X } from 'lucide-react';
import LoadingButton from './LoadingButton';

export default function DocumentModal({ document, url, onClose, onDecision, deciding }) {
  if (!document) return null;
  const isImage = document.mime_type?.includes('image');
  return (
    <div className="modal-backdrop">
      <div className="modal wide">
        <div className="modal-head">
          <div>
            <h3>{document.type?.name}</h3>
            <span>{document.original_filename}</span>
          </div>
          <button className="icon-btn" disabled={deciding} onClick={onClose}><X size={18} /></button>
        </div>
        <div className={`preview-pane ${isImage ? 'image-preview' : 'pdf-preview'}`}>
          {isImage ? <img src={url} alt={document.type?.name} /> : <iframe src={url} title={document.type?.name} />}
        </div>
        {onDecision && (
          <div className="decision-row">
            <LoadingButton className="btn success" loading={deciding === 'legit'} disabled={!!deciding} onClick={() => onDecision('legit')}>Document is legitimate</LoadingButton>
            <LoadingButton className="btn warning" loading={deciding === 'requires_correction'} disabled={!!deciding} onClick={() => onDecision('requires_correction')}>Requires Correction</LoadingButton>
            <LoadingButton className="btn danger" loading={deciding === 'rejected'} disabled={!!deciding} onClick={() => onDecision('rejected')}>Rejected</LoadingButton>
          </div>
        )}
      </div>
    </div>
  );
}
