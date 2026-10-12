import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { ScheduleItem } from '../../types';
import { parseGoogleDriveUrl, isValidUrl } from '../../utils/drive';
import { ExternalLink, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface ScheduleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: Partial<ScheduleItem>) => Promise<void>;
  scheduleToEdit: ScheduleItem | null;
}

export const ScheduleEditModal: React.FC<ScheduleEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  scheduleToEdit,
}) => {
  const [categoryName, setCategoryName] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sourceDocUrl, setSourceDocUrl] = useState('');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    if (scheduleToEdit) {
      setCategoryName(scheduleToEdit.categoryName || '');
      setSubcategory(scheduleToEdit.subcategory || '');
      setDate(scheduleToEdit.date || '');
      setTime(scheduleToEdit.time || '');
      setVenue(scheduleToEdit.venue || '');
      setImageUrl(scheduleToEdit.imageUrl || '');
      setSourceDocUrl(scheduleToEdit.sourceDocUrl || '');
      setNotes(scheduleToEdit.notes || '');
    } else {
      setCategoryName('');
      setSubcategory('');
      setDate('');
      setTime('');
      setVenue('');
      setImageUrl('');
      setSourceDocUrl('');
      setNotes('');
    }
    setError(null);
    setPreviewError(false);
  }, [scheduleToEdit, isOpen]);

  const parsedDrive = parseGoogleDriveUrl(imageUrl);
  const effectivePreviewSrc = parsedDrive.isDrive ? parsedDrive.imageUrl : imageUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setError('Category Name is required.');
      return;
    }

    if (imageUrl.trim() && !isValidUrl(imageUrl.trim())) {
      setError('Please provide a valid image URL (http:// or https://) or Google Drive link.');
      return;
    }

    if (sourceDocUrl.trim() && !isValidUrl(sourceDocUrl.trim())) {
      setError('Please provide a valid source document URL (http:// or https://).');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: scheduleToEdit?.id,
        categoryName: categoryName.trim(),
        subcategory: subcategory.trim() || undefined,
        date: date.trim(),
        time: time.trim() || undefined,
        venue: venue.trim(),
        imageUrl: imageUrl.trim(),
        sourceDocUrl: sourceDocUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save schedule record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={scheduleToEdit ? 'Edit Schedule Record' : 'Add New Schedule Category'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Badminton, Debat, Robotik"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subcategory / Level
            </label>
            <input
              type="text"
              placeholder="e.g. Bawah 18 Tahun, Peringkat Akhir"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
            <input
              type="text"
              placeholder="e.g. 15 Mei 2026"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Time Window</label>
            <input
              type="text"
              placeholder="e.g. 08:30 - 17:00"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Venue / Arena</label>
            <input
              type="text"
              placeholder="e.g. Dewan Utama / Gelanggang A"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Schedule Image URL or Google Drive Link
            </label>
            {parsedDrive.isDrive && (
              <span className="text-[11px] text-indigo-600 font-medium">Google Drive link detected</span>
            )}
          </div>
          <input
            type="url"
            placeholder="https://drive.google.com/file/d/... or direct image URL"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              setPreviewError(false);
            }}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Accepts standard web image URLs (PNG, JPG, WebP) or Google Drive sharing links. For Google Drive files, ensure access is set to &ldquo;Anyone with the link can view&rdquo;.
          </p>
        </div>

        {/* Live Image Preview Check */}
        {imageUrl && (
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
            <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                Image Preview
              </span>
              {parsedDrive.isDrive && parsedDrive.directUrl && (
                <a
                  href={parsedDrive.directUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <span>Open in Drive</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="h-44 w-full bg-white rounded-md border border-slate-200 flex items-center justify-center overflow-hidden relative">
              {previewError ? (
                <div className="text-center p-4 text-xs text-slate-500">
                  <p className="text-rose-600 font-medium mb-1">Unable to preview image directly.</p>
                  <p>Check the URL or Google Drive sharing permissions. You can still save this link.</p>
                </div>
              ) : (
                <img
                  src={effectivePreviewSrc || ''}
                  alt="Schedule preview"
                  onError={() => setPreviewError(true)}
                  className="max-h-full max-w-full object-contain"
                />
              )}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Source Document Link (Optional)
          </label>
          <input
            type="url"
            placeholder="https://drive.google.com/... or official schedule document link"
            value={sourceDocUrl}
            onChange={(e) => setSourceDocUrl(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Direct link to the original Google Drive spreadsheet, PDF, or competition document for download.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Operational Remarks / Guidelines
          </label>
          <textarea
            rows={2}
            placeholder="Important briefing notes, call times, or uniform reminders for this category..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
