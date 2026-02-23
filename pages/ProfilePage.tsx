// src/pages/ProfilePage.tsx
import React, { useEffect, useState, useRef, ChangeEvent, FormEvent, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuthUser, NotificationMessage, ChangePasswordPayload } from '../types';
import Notification from '../components/Notification';
import Modal from '../components/Modal';
import { formatIsoToShamsiDateTime } from '../utils/dateUtils';
import { apiFetch } from '../utils/apiFetch';
import { useStyle } from '../contexts/StyleContext';

const MAX_AVATAR_MB = 2;

const ProfilePage: React.FC = () => {
  const { currentUser: contextUser, isLoading: authProcessLoading, authReady, updateCurrentUser } = useAuth();
  const { style } = useStyle();
  const brand = `hsl(${style.primaryHue} 90% 55%)`;

  const [profileData, setProfileData] = useState<AuthUser | null>(contextUser);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  // Avatar states
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(contextUser?.avatarUrl || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Password Change states
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPw, setShowPw] = useState<{ old: boolean; n1: boolean; n2: boolean }>({ old: false, n1: false, n2: false });
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState<Partial<typeof passwordData>>({});

  useEffect(() => {
    if (contextUser) {
      setProfileData(contextUser);
      setAvatarPreview(contextUser.avatarUrl || null);
    }
  }, [contextUser]);

  /* ------------------------ Avatar ------------------------ */
  const handleAvatarFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
        setNotification({ type: 'error', text: `حجم فایل آواتار نباید بیشتر از ${MAX_AVATAR_MB} مگابایت باشد.` });
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        setNotification({ type: 'error', text: 'فرمت فایل آواتار نامعتبر است. (مجاز: JPG, PNG, GIF)' });
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setIsUploadingAvatar(true);
    setNotification(null);
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    try {
      const response = await apiFetch('/api/me/upload-avatar', { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در آپلود آواتار');

      setNotification({ type: 'success', text: 'آواتار با موفقیت به‌روزرسانی شد.' });
      updateCurrentUser({ avatarUrl: result.data.avatarUrl });
      setAvatarFile(null);
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
      setAvatarPreview(profileData?.avatarUrl || null);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm('آواتار فعلی حذف شود؟')) return;
    try {
      const res = await apiFetch('/api/me/remove-avatar', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'خطا در حذف آواتار');
      updateCurrentUser({ avatarUrl: null as any });
      setAvatarPreview(null);
      setAvatarFile(null);
      setNotification({ type: 'success', text: 'آواتار حذف شد.' });
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
    }
  };

  /* --------------------- Password Change --------------------- */
  const handlePasswordInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    if (passwordErrors[name as keyof typeof passwordErrors]) {
      setPasswordErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // قدرت رمز: 0-4
  const pwScore = useMemo(() => {
    const s = passwordData.newPassword;
    let score = 0;
    if (s.length >= 6) score++;
    if (/[A-Zآ-ی]/.test(s)) score++;
    if (/[0-9]/.test(s)) score++;
    if (/[^A-Za-z0-9آ-ی]/.test(s)) score++;
    return score;
  }, [passwordData.newPassword]);

  const validatePasswordForm = (): boolean => {
    const errors: Partial<typeof passwordData> = {};
    if (!passwordData.oldPassword) errors.oldPassword = 'کلمه عبور فعلی الزامی است.';
    if (!passwordData.newPassword) errors.newPassword = 'کلمه عبور جدید الزامی است.';
    else if (passwordData.newPassword.length < 6) errors.newPassword = 'کلمه عبور جدید باید حداقل ۶ کاراکتر باشد.';
    if (passwordData.newPassword !== passwordData.confirmNewPassword)
      errors.confirmNewPassword = 'کلمه عبور جدید و تکرار آن یکسان نیستند.';
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;
    setIsChangingPassword(true);
    setNotification(null);
    try {
      const payload: ChangePasswordPayload = {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
      };
      const response = await apiFetch('/api/me/change-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در تغییر کلمه عبور');

      setNotification({ type: 'success', text: 'کلمه عبور با موفقیت تغییر کرد.' });
      setIsPasswordModalOpen(false);
      setPasswordData({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (error: any) {
      if (String(error.message).includes('فعلی')) {
        setPasswordErrors(prev => ({ ...prev, oldPassword: error.message }));
      } else {
        setNotification({ type: 'error', text: error.message });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  /* -------------------- Skeleton / Guards -------------------- */
  if (!authReady || authProcessLoading) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-300">
        <i className="fas fa-spinner fa-spin text-2xl ml-2" />
        در حال بارگذاری اطلاعات پروفایل...
      </div>
    );
  }
  if (!profileData) {
    return <div className="p-6 text-center text-red-500 dark:text-red-400">اطلاعات پروفایل کاربر یافت نشد. لطفاً دوباره وارد شوید.</div>;
  }

  const row = (label: string, value: React.ReactNode, icon: string) => (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0 border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
        <i className={`fa-solid ${icon}`} />
        <span className="font-medium">{label}</span>
      </div>
      <div className="text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );

  return (
    <div className="space-y-6 text-right max-w-7xl mx-auto px-4" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8 max-w-3xl mx-auto">
        <div className="flex items-start justify-between pb-4 mb-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <i className="fa-solid fa-id-card-clip text-xl" style={{ color: brand }} />
            پروفایل کاربری
          </h1>
          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="px-3 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90"
            style={{ backgroundColor: brand }}
            title="تغییر کلمه عبور"
          >
            <i className="fa-solid fa-key ml-1" />
            تغییر کلمه عبور
          </button>
        </div>

        {/* Avatar + quick info */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
          <div className="relative group">
            <div
              className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 text-5xl shadow-md overflow-hidden cursor-pointer ring-2"
              style={{ borderColor: 'transparent', boxShadow: `0 0 0 2px ${brand}22` }}
              onClick={() => avatarInputRef.current?.click()}
              title="تغییر آواتار"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="آواتار" className="w-full h-full object-cover" />
              ) : (
                <i className="fas fa-user" />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
                <i className="fas fa-camera text-white text-3xl opacity-0 group-hover:opacity-100 transition-opacity"></i>
              </div>
            </div>
            <input type="file" accept="image/png, image/jpeg, image/gif" ref={avatarInputRef} onChange={handleAvatarFileChange} hidden />
            <div className="flex gap-2 mt-3">
              {avatarFile ? (
                <button
                  onClick={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                  className="px-3 py-1.5 rounded-md text-white text-sm disabled:opacity-60"
                  style={{ backgroundColor: brand }}
                >
                  {isUploadingAvatar ? <i className="fas fa-spinner fa-spin" /> : 'ذخیره آواتار'}
                </button>
              ) : null}
              {avatarPreview && !avatarFile && (
                <button
                  onClick={handleRemoveAvatar}
                  className="px-3 py-1.5 rounded-md text-sm bg-red-500 text-white hover:bg-red-600"
                >
                  حذف آواتار
                </button>
              )}
            </div>
          </div>

          <div className="w-full sm:flex-1">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                اطلاعات حساب
              </div>
              <div className="px-4">
                {row('نام کاربری', profileData.username, 'fa-user')}
                {row('نقش', profileData.roleName, 'fa-user-gear')}
                {row('تاریخ عضویت', profileData.dateAdded ? formatIsoToShamsiDateTime(profileData.dateAdded) : 'نامشخص', 'fa-calendar-days')}
                {row('آخرین ورود', profileData.lastLogin ? formatIsoToShamsiDateTime(profileData.lastLogin) : '—', 'fa-clock')}
              </div>
            </div>
          </div>
        </div>

        {/* Tip */}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          برای تغییر سایر تنظیمات حساب با مدیر سیستم تماس بگیرید.
        </div>
      </div>

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <Modal title="تغییر کلمه عبور" onClose={() => setIsPasswordModalOpen(false)} widthClass="max-w-md">
          <form onSubmit={handleChangePassword} className="space-y-4 p-1">
            <div>
              <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                کلمه عبور فعلی
              </label>
              <div className="relative">
                <input
                  type={showPw.old ? 'text' : 'password'}
                  id="oldPassword"
                  name="oldPassword"
                  value={passwordData.oldPassword}
                  onChange={handlePasswordInputChange}
                  className={`w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 text-sm text-right ${passwordErrors.oldPassword ? 'border-red-500' : 'border-gray-300'}`}
                  required
                />
                <button type="button" onClick={() => setShowPw(s => ({ ...s, old: !s.old }))} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">
                  <i className={`fa-solid ${showPw.old ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
              {passwordErrors.oldPassword && <p className="text-xs text-red-600 mt-1">{passwordErrors.oldPassword}</p>}
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                کلمه عبور جدید
              </label>
              <div className="relative">
                <input
                  type={showPw.n1 ? 'text' : 'password'}
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordInputChange}
                  className={`w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 text-sm text-right ${passwordErrors.newPassword ? 'border-red-500' : 'border-gray-300'}`}
                  required
                />
                <button type="button" onClick={() => setShowPw(s => ({ ...s, n1: !s.n1 }))} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">
                  <i className={`fa-solid ${showPw.n1 ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>

              {/* Password strength */}
              <div className="mt-2 h-1.5 w-full rounded bg-gray-200 dark:bg-gray-600 overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${(pwScore / 4) * 100}%`,
                    backgroundColor: pwScore >= 3 ? '#16a34a' : pwScore === 2 ? '#eab308' : '#ef4444',
                  }}
                />
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">حداقل ۶ کاراکتر، ترجیحا شامل عدد و علامت.</p>

              {passwordErrors.newPassword && <p className="text-xs text-red-600 mt-1">{passwordErrors.newPassword}</p>}
            </div>

            <div>
              <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                تکرار کلمه عبور جدید
              </label>
              <div className="relative">
                <input
                  type={showPw.n2 ? 'text' : 'password'}
                  id="confirmNewPassword"
                  name="confirmNewPassword"
                  value={passwordData.confirmNewPassword}
                  onChange={handlePasswordInputChange}
                  className={`w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 text-sm text-right ${passwordErrors.confirmNewPassword ? 'border-red-500' : 'border-gray-300'}`}
                  required
                />
                <button type="button" onClick={() => setShowPw(s => ({ ...s, n2: !s.n2 }))} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">
                  <i className={`fa-solid ${showPw.n2 ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
              {passwordErrors.confirmNewPassword && <p className="text-xs text-red-600 mt-1">{passwordErrors.confirmNewPassword}</p>}
            </div>

            <div className="flex justify-end pt-3 gap-2 border-t dark:border-gray-700 mt-4">
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={isChangingPassword}
                className="px-4 py-2 text-white rounded-lg disabled:opacity-60"
                style={{ backgroundColor: brand }}
              >
                {isChangingPassword ? <><i className="fas fa-spinner fa-spin ml-2" />در حال تغییر...</> : 'ثبت تغییرات'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ProfilePage;
