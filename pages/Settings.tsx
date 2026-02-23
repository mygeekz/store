// pages/Settings.tsx
import React, { useState, useEffect, FormEvent, ChangeEvent, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  BusinessInformationSettings,
  NotificationMessage,
  Role,
  UserForDisplay,
  NewUserFormData,
  EditUserFormData,
} from '../types';
import Notification from '../components/Notification';
import Modal from '../components/Modal';
import FormSection from '../components/FormSection';
type BackupItem = { fileName: string; size: number; mtime: string };

import SmsPatternTestModal from '../components/SmsPatternTestModal';
import SmsPatternPreviewModal from '../components/SmsPatternPreviewModal';
import TelegramTemplateTestModal from '../components/TelegramTemplateTestModal';
import TelegramLogsPanel from '../components/TelegramLogsPanel';
import SmsLogsPanel from '../components/SmsLogsPanel';
import SmsHealthCheckPanel from '../components/SmsHealthCheckPanel';
import SmsBulkTestModal, { SmsPatternDef } from '../components/SmsBulkTestModal';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { useStyle } from '../contexts/StyleContext';
import HubCard from '../components/HubCard';
import PageShell from '../components/ui/PageShell';

// افزودن تب جدید برای تنظیمات تلگرام
type TabKey = 'account' | 'business' | 'sms' | 'telegram' | 'style' | 'users' | 'data';

const Settings: React.FC = () => {
  const { currentUser, updateCurrentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { style, setStyle, resetStyle, toggleTheme, setTheme } = useStyle();

  // ---- Tabs
  const [tab, setTab] = useState<TabKey>('business');

  // ---- Business & SMS (Server settings)
  const [businessInfo, setBusinessInfo] = useState<BusinessInformationSettings>({});
  const [initialBusinessInfo, setInitialBusinessInfo] = useState<BusinessInformationSettings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

	// ---- SMS test modal (Pattern)
	const [smsTestOpen, setSmsTestOpen] = useState(false);
	const [smsTestTitle, setSmsTestTitle] = useState('ارسال تست پیامک');
	const [smsTestBodyId, setSmsTestBodyId] = useState('');
	const [smsTestTokenLabels, setSmsTestTokenLabels] = useState<string[]>([]);

	// ---- SMS preview modal
	const [smsPrevOpen, setSmsPrevOpen] = useState(false);

  const [tgTestOpen, setTgTestOpen] = useState(false);
  const [tgTestTitle, setTgTestTitle] = useState('');
  const [tgTestTemplate, setTgTestTemplate] = useState('');
	const [smsPrevTitle, setSmsPrevTitle] = useState('پیش‌نمایش پیامک');
	const [smsPrevTemplate, setSmsPrevTemplate] = useState('');
	const [smsPrevTokenLabels, setSmsPrevTokenLabels] = useState<string[]>([]);

	// ---- SMS Health / Bulk Test
	const [smsBulkOpen, setSmsBulkOpen] = useState(false);
	const [smsBulkDefaults, setSmsBulkDefaults] = useState<string[]>([]);

  // ---- Telegram Health / Quick Test
  const [tgHealth, setTgHealth] = useState<{ ok: boolean; msg: string; bot?: any } | null>(null);
  const [tgIsChecking, setTgIsChecking] = useState(false);
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [tgQuickMsg, setTgQuickMsg] = useState('✅ تست اتصال تلگرام کوروش');
  const [tgIsSendingQuick, setTgIsSendingQuick] = useState(false);

  // ---- Logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ---- Account (Profile / Security)
  const [meAvatarFile, setMeAvatarFile] = useState<File | null>(null);
  const [meAvatarPreview, setMeAvatarPreview] = useState<string | null>(null);
  const meAvatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // ---- Notifications
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  // ---- DB Backup/Restore
  const [dbFile, setDbFile] = useState<File | null>(null);
  const [isRestoringDb, setIsRestoringDb] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const dbFileInputRef = useRef<HTMLInputElement>(null);

  const [backupList, setBackupList] = useState<BackupItem[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [backupEnabled, setBackupEnabled] = useState(true);
  const [backupCron, setBackupCron] = useState('0 2 * * *');
  const [backupTimezone, setBackupTimezone] = useState('Asia/Tehran');
  const [backupRetention, setBackupRetention] = useState(14);

  // ---- Users
  const [users, setUsers] = useState<UserForDisplay[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const initialNewUserState: NewUserFormData = { username: '', password: '', confirmPassword: '', roleId: '' };
  const [newUser, setNewUser] = useState<NewUserFormData>(initialNewUserState);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [addUserFormErrors, setAddUserFormErrors] = useState<Partial<NewUserFormData>>({});
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<EditUserFormData | null>(null);
  const [editUserFormErrors, setEditUserFormErrors] = useState<Partial<EditUserFormData>>({});
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState<UserForDisplay | null>(null);
  const [resetPasswordData, setResetPasswordData] = useState({ password: '', confirmPassword: '' });
  const [resetPasswordErrors, setResetPasswordErrors] = useState<Partial<typeof resetPasswordData>>({});
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserForDisplay | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // ---------- fetchData: بارگذاری همه‌چیز یکجا
  const fetchData = async () => {
    // فقط ادمین اجازه دارد
    if (!currentUser) return;
    if (currentUser.roleName !== 'Admin') {
      // کاربران غیرادمین فقط به تب «حساب کاربری» دسترسی دارند.
      setIsLoading(false);
      setTab('account');
      return;
    }

    let alive = true;
    setIsLoading(true);
    try {
      const [settingsRes, usersRes, rolesRes] = await Promise.all([
        apiFetch('/api/settings'),
        apiFetch('/api/users'),
        apiFetch('/api/roles'),
      ]);

      const [settingsJson, usersJson, rolesJson] = await Promise.all([
        settingsRes.json(),
        usersRes.json(),
        rolesRes.json(),
      ]);

      if (!settingsRes.ok || !settingsJson.success) throw new Error(settingsJson.message || 'خطا در دریافت تنظیمات');
      if (!usersRes.ok || !usersJson.success) throw new Error(usersJson.message || 'خطا در دریافت کاربران');
      if (!rolesRes.ok || !rolesJson.success) throw new Error(rolesJson.message || 'خطا در دریافت نقش‌ها');
      if (!alive) return;

      const sortedRoles: Role[] = rolesJson.data.sort((a: Role, b: Role) =>
        a.name === 'Admin' ? -1 : b.name === 'Admin' ? 1 : a.name.localeCompare(b.name, 'fa')
      );
      setRoles(sortedRoles);

      const enrichedUsers = usersJson.data.map((u: any) => {
        const role = sortedRoles.find(r => r.id === u.roleId);
        return { ...u, roleName: role?.name ?? '---' };
      });
      setUsers(enrichedUsers);

      const info: BusinessInformationSettings = settingsJson.data;
      setBusinessInfo(info);
      setInitialBusinessInfo(info);
      // Sync QR public base URL to localStorage for non-admin pages
      try {
        const v = (info as any).qr_public_base_url;
        if (v) localStorage.setItem('qr_public_base_url', String(v));
        else localStorage.removeItem('qr_public_base_url');
      } catch {}

      if (info.store_logo_path) {
        setLogoPreview(`/uploads/${info.store_logo_path}?t=${Date.now()}`);
      }

      if (sortedRoles.length && !newUser.roleId) {
        setNewUser(prev => ({ ...prev, roleId: sortedRoles[0].id }));
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'خطای ناشناخته' });
    } finally {
      setIsLoading(false);
    }

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      alive = false;
    };
  };

  // بارگذاری اولیه
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, navigate]);

  // ------- Business form handlers
  const handleBusinessInfoChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBusinessInfo(prev => ({ ...prev, [name]: value }));
  };

  const openSmsPatternTest = (title: string, bodyId: string, tokenLabels: string[]) => {
    setSmsTestTitle(title);
    setSmsTestBodyId(bodyId || '');
    setSmsTestTokenLabels(tokenLabels);
    setSmsTestOpen(true);
  };

  const openSmsPatternPreview = (title: string, previewTemplate: string, tokenLabels: string[]) => {
    setSmsPrevTitle(title);
    setSmsPrevTemplate(previewTemplate || '');
    setSmsPrevTokenLabels(tokenLabels);
    setSmsPrevOpen(true);
  };

  const openTelegramTemplateTest = (title: string, template: string) => {
    setTgTestTitle(title);
    setTgTestTemplate(template || '');
    setTgTestOpen(true);
  };

  const checkTelegramHealth = async () => {
    setTgIsChecking(true);
    setTgHealth(null);
    try {
      const res = await apiFetch('/api/telegram/health');
      const js = await res.json().catch(() => ({}));
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در بررسی اتصال تلگرام');
      setTgHealth({ ok: true, msg: js?.message || 'اتصال برقرار است.', bot: js?.data?.bot });
    } catch (e: any) {
      setTgHealth({ ok: false, msg: e?.message || 'ناموفق' });
    } finally {
      setTgIsChecking(false);
    }
  };

  const sendTelegramQuickTest = async () => {
    setTgIsSendingQuick(true);
    try {
      const res = await apiFetch('/api/telegram/test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: tgQuickMsg }),
      });
      const js = await res.json().catch(() => ({}));
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در ارسال تست تلگرام');
      setNotification({ type: 'success', text: js?.message || 'ارسال شد.' });
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'ناموفق' });
    } finally {
      setTgIsSendingQuick(false);
    }
  };

  // ------- Telegram settings validation (similar to SMS checks)
  const handleTelegramSettingsSubmit = async () => {
    try {
      const errs: string[] = [];
      const botToken = String((businessInfo as any).telegram_bot_token || '').trim();
      const chatId = String((businessInfo as any).telegram_chat_id || '').trim();
      const proxy = String((businessInfo as any).telegram_proxy || '').trim();
      const silent = String((businessInfo as any).telegram_silent_hours || '').trim();

      const chatLists = {
        reports: String((businessInfo as any).telegram_chat_ids_reports || '').trim(),
        installments: String((businessInfo as any).telegram_chat_ids_installments || '').trim(),
        sales: String((businessInfo as any).telegram_chat_ids_sales || '').trim(),
        notifications: String((businessInfo as any).telegram_chat_ids_notifications || '').trim(),
      };

      const hasAnyTopicChat = Object.values(chatLists).some((v) => !!v);

      // token format: <digits>:<secret>
      if (!botToken) errs.push('توکن ربات تلگرام را وارد کنید.');
      else if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(botToken)) errs.push('فرمت توکن ربات تلگرام نامعتبر است.');

      // At least one destination should exist
      if (!chatId && !hasAnyTopicChat) errs.push('حداقل یک Chat ID مقصد (عمومی یا برای یکی از Topicها) را وارد کنید.');

      const isValidChatId = (v: string) => /^-?\d+$/.test(v.trim());
      if (chatId && !isValidChatId(chatId)) errs.push('شناسه چت (telegram_chat_id) باید عدد باشد (مثلاً -100123... یا 123...).');

      const splitChatIds = (txt: string) => txt.split(/[\n,؛;\s]+/g).map(s => s.trim()).filter(Boolean);
      for (const [k, v] of Object.entries(chatLists)) {
        if (!v) continue;
        const bad = splitChatIds(v).filter((x) => !isValidChatId(x));
        if (bad.length) errs.push(`Chat IDهای بخش «${k}» نامعتبر است: ${bad.slice(0, 3).join(', ')}${bad.length > 3 ? '…' : ''}`);
      }

      // proxy format (optional)
      if (proxy && !/^(socks5|socks|http|https):\/\//i.test(proxy)) errs.push('فرمت پراکسی تلگرام نامعتبر است. مثال: socks5://127.0.0.1:10808');

      // silent hours format (optional): HH:mm-HH:mm
      if (silent) {
        const m = silent.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
        if (!m) errs.push('فرمت ساعات سکوت تلگرام نامعتبر است. مثال: 22:00-08:00');
        else {
          const hh1 = Number(m[1]), mm1 = Number(m[2]), hh2 = Number(m[3]), mm2 = Number(m[4]);
          const ok = (hh1>=0 && hh1<=23 && hh2>=0 && hh2<=23 && mm1>=0 && mm1<=59 && mm2>=0 && mm2<=59);
          if (!ok) errs.push('ساعات سکوت تلگرام خارج از بازه است (00-23 و 00-59).');
        }
      }

      if (errs.length) {
        setNotification({ type: 'error', text: errs[0] });
        return;
      }

      await handleBusinessInfoSubmit();
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'خطا در ذخیره تنظیمات تلگرام' });
    }
  };

	// تعریف مرکزی پترن‌های ملی پیامک (برای UI، Health Check و تست گروهی)
	const meliPatternDefs: SmsPatternDef[] = [
		{
			key: 'meli_payamak_installment_reminder_pattern_id',
			label: 'یادآوری قسط (کلی)',
			category: 'اقساط',
			accent: 'emerald',
			iconClass: 'fa-solid fa-bell',
			tokens: ['نام مشتری', 'مبلغ', 'تاریخ سررسید'],
			previewTemplate: 'سلام {1}\nیادآوری قسط شما به مبلغ {2}.\nسررسید: {3}',
		},
		{
			key: 'meli_payamak_installment_completed_pattern_id',
			label: 'تسویه کامل اقساط (پرداخت نهایی)',
			category: 'اقساط',
			accent: 'emerald',
			iconClass: 'fa-solid fa-circle-check',
			tokens: ['نام مشتری', 'شماره فروش', 'مبلغ کل'],
			previewTemplate: 'سلام {1}\nاقساط فروش شماره {2} با موفقیت تسویه شد.\nمبلغ کل: {3}',
		},
		{
			key: 'meli_payamak_installment_due_7_pattern_id',
			label: 'قسط - ۷ روز قبل',
			category: 'اقساط',
			accent: 'emerald',
			iconClass: 'fa-solid fa-calendar-day',
			tokens: ['نام مشتری', 'مبلغ', 'تاریخ سررسید'],
			previewTemplate: 'سلام {1}\n۷ روز تا سررسید قسط شما باقی مانده.\nمبلغ: {2}\nسررسید: {3}',
		},
		{
			key: 'meli_payamak_installment_due_3_pattern_id',
			label: 'قسط - ۳ روز قبل',
			category: 'اقساط',
			accent: 'emerald',
			iconClass: 'fa-solid fa-calendar',
			tokens: ['نام مشتری', 'مبلغ', 'تاریخ سررسید'],
			previewTemplate: 'سلام {1}\n۳ روز تا سررسید قسط شما باقی مانده.\nمبلغ: {2}\nسررسید: {3}',
		},
		{
			key: 'meli_payamak_installment_due_today_pattern_id',
			label: 'قسط - همان روز',
			category: 'اقساط',
			accent: 'emerald',
			iconClass: 'fa-solid fa-clock',
			tokens: ['نام مشتری', 'مبلغ', 'تاریخ سررسید'],
			previewTemplate: 'سلام {1}\nامروز سررسید قسط شماست.\nمبلغ: {2}\nسررسید: {3}',
		},
		{
			key: 'meli_payamak_repair_received_pattern_id',
			label: 'پذیرش تعمیر',
			category: 'تعمیرات',
			accent: 'blue',
			iconClass: 'fa-solid fa-inbox',
			tokens: ['نام مشتری', 'مدل دستگاه', 'شماره تعمیر'],
			previewTemplate: 'سلام {1}\nدستگاه {2} شما پذیرش شد.\nشماره تعمیر: {3}',
		},
		{
			key: 'meli_payamak_repair_cost_estimated_pattern_id',
			label: 'برآورد هزینه تعمیر',
			category: 'تعمیرات',
			accent: 'blue',
			iconClass: 'fa-solid fa-calculator',
			tokens: ['نام مشتری', 'مدل دستگاه', 'هزینه تخمینی'],
			previewTemplate: 'سلام {1}\nبرآورد هزینه تعمیر {2}: {3}',
		},
		{
			key: 'meli_payamak_repair_ready_pattern_id',
			label: 'آماده تحویل تعمیر',
			category: 'تعمیرات',
			accent: 'blue',
			iconClass: 'fa-solid fa-box-open',
			tokens: ['نام مشتری', 'مدل دستگاه', 'هزینه نهایی'],
			previewTemplate: 'سلام {1}\nتعمیر {2} آماده تحویل است.\nهزینه نهایی: {3}',
		},
		{
			key: 'meli_payamak_check_due_7_pattern_id',
			label: 'چک - ۷ روز قبل',
			category: 'چک‌ها',
			accent: 'amber',
			iconClass: 'fa-solid fa-file-invoice',
			tokens: ['نام مشتری', 'شماره چک', 'تاریخ سررسید', 'مبلغ'],
			previewTemplate: 'سلام {1}\n۷ روز تا سررسید چک شماره {2} باقی مانده.\nسررسید: {3}\nمبلغ: {4}',
		},
		{
			key: 'meli_payamak_check_due_3_pattern_id',
			label: 'چک - ۳ روز قبل',
			category: 'چک‌ها',
			accent: 'amber',
			iconClass: 'fa-solid fa-file-signature',
			tokens: ['نام مشتری', 'شماره چک', 'تاریخ سررسید', 'مبلغ'],
			previewTemplate: 'سلام {1}\n۳ روز تا سررسید چک شماره {2} باقی مانده.\nسررسید: {3}\nمبلغ: {4}',
		},
		{
			key: 'meli_payamak_check_due_today_pattern_id',
			label: 'چک - همان روز',
			category: 'چک‌ها',
			accent: 'amber',
			iconClass: 'fa-solid fa-calendar-check',
			tokens: ['نام مشتری', 'شماره چک', 'تاریخ سررسید', 'مبلغ'],
			previewTemplate: 'سلام {1}\nامروز سررسید چک شماره {2} است.\nسررسید: {3}\nمبلغ: {4}',
		},
	];

  
  // تعریف مرکزی قالب‌های تلگرام (برای پیش‌نمایش و تست)
  const telegramTemplateDefs = [
    {
      key: 'telegram_installment_reminder_message',
      label: 'یادآوری قسط (کلی)',
      category: 'اقساط',
      iconClass: 'fa-solid fa-bell',
      preview: '🔔 یادآوری قسط\nمشتری: {name}\nمبلغ: {amount}\nسررسید: {dueDate}',
    },
    {
      key: 'telegram_installment_due_7_message',
      label: 'قسط - ۷ روز قبل',
      category: 'اقساط',
      iconClass: 'fa-solid fa-calendar-day',
      preview: '⏳ ۷ روز مانده تا سررسید قسط\nمشتری: {name}\nمبلغ: {amount}\nسررسید: {dueDate}',
    },
    {
      key: 'telegram_installment_due_3_message',
      label: 'قسط - ۳ روز قبل',
      category: 'اقساط',
      iconClass: 'fa-solid fa-calendar',
      preview: '⏳ ۳ روز مانده تا سررسید قسط\nمشتری: {name}\nمبلغ: {amount}\nسررسید: {dueDate}',
    },
    {
      key: 'telegram_installment_due_today_message',
      label: 'قسط - همان روز',
      category: 'اقساط',
      iconClass: 'fa-solid fa-clock',
      preview: '⏰ امروز سررسید قسط است\nمشتری: {name}\nمبلغ: {amount}\nسررسید: {dueDate}',
    },
    {
      key: 'telegram_installment_completed_message',
      label: 'تسویه کامل اقساط (پرداخت نهایی)',
      category: 'اقساط',
      iconClass: 'fa-solid fa-circle-check',
      preview: '✅ تسویه اقساط\nمشتری: {name}\nشماره فروش: {saleId}\nمبلغ کل: {total}',
    },
    {
      key: 'telegram_repair_received_message',
      label: 'پذیرش تعمیر',
      category: 'تعمیرات',
      iconClass: 'fa-solid fa-inbox',
      preview: '📥 پذیرش تعمیر\nمشتری: {name}\nدستگاه: {deviceModel}\nکد تعمیر: {repairId}',
    },
    {
      key: 'telegram_repair_cost_estimated_message',
      label: 'برآورد هزینه تعمیر',
      category: 'تعمیرات',
      iconClass: 'fa-solid fa-calculator',
      preview: '🧮 برآورد هزینه تعمیر\nمشتری: {name}\nدستگاه: {deviceModel}\nکد تعمیر: {repairId}\nهزینه: {estimatedCost}',
    },
    {
      key: 'telegram_repair_ready_message',
      label: 'آماده تحویل تعمیر',
      category: 'تعمیرات',
      iconClass: 'fa-solid fa-box-open',
      preview: '📦 آماده تحویل\nمشتری: {name}\nدستگاه: {deviceModel}\nکد تعمیر: {repairId}\nهزینه نهایی: {finalCost}',
    },
    {
      key: 'telegram_check_due_7_message',
      label: 'چک - ۷ روز قبل',
      category: 'چک‌ها',
      iconClass: 'fa-solid fa-file-invoice',
      preview: '🧾 ۷ روز مانده تا سررسید چک\nمشتری: {name}\nشماره چک: {checkNumber}\nتاریخ: {dueDate}\nمبلغ: {amount}',
    },
    {
      key: 'telegram_check_due_3_message',
      label: 'چک - ۳ روز قبل',
      category: 'چک‌ها',
      iconClass: 'fa-solid fa-file-signature',
      preview: '🧾 ۳ روز مانده تا سررسید چک\nمشتری: {name}\nشماره چک: {checkNumber}\nتاریخ: {dueDate}\nمبلغ: {amount}',
    },
    {
      key: 'telegram_check_due_today_message',
      label: 'چک - همان روز',
      category: 'چک‌ها',
      iconClass: 'fa-solid fa-calendar-check',
      preview: '🧾 امروز سررسید چک است\nمشتری: {name}\nشماره چک: {checkNumber}\nتاریخ: {dueDate}\nمبلغ: {amount}',
    },
  ] as const;

const handleBusinessInfoSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setNotification(null);
    try {
      const response = await apiFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify(businessInfo),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در ذخیره اطلاعات');
      setNotification({ type: 'success', text: 'تنظیمات با موفقیت ذخیره شد.' });
      setInitialBusinessInfo(businessInfo);
      // Sync QR public base URL to localStorage
      try {
        const v = (businessInfo as any).qr_public_base_url;
        if (v) localStorage.setItem('qr_public_base_url', String(v));
        else localStorage.removeItem('qr_public_base_url');
      } catch {}

    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  // ------- Logo
  const logoInputRefClick = () => logoInputRef.current?.click();
  const handleLogoFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        setNotification({ type: 'error', text: 'حجم فایل لوگو نباید بیشتر از 2 مگابایت باشد.' });
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'].includes(file.type)) {
        setNotification({ type: 'error', text: 'فرمت فایل لوگو نامعتبر است. (مجاز: JPG, PNG, GIF, SVG, WebP)' });
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };
  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setIsUploadingLogo(true);
    const formData = new FormData();
    formData.append('logo', logoFile);
    try {
      const response = await apiFetch('/api/settings/upload-logo', { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setNotification({ type: 'success', text: 'لوگو با موفقیت آپلود شد.' });
      setBusinessInfo(prev => ({ ...prev, store_logo_path: result.data.filePath.replace('/uploads/', '') }));
      setLogoFile(null);
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  
  const fetchBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const res = await apiFetch('/api/backup/list');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'خطا در دریافت لیست بکاپ‌ها');
      setBackupList(data.data || []);
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleCreateBackupNow = async () => {
    setNotification({ type: 'info', text: 'در حال ایجاد بکاپ...' });
    try {
      const res = await apiFetch('/api/backup/create', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'خطا در ایجاد بکاپ');
      setNotification({ type: 'success', text: 'بکاپ با موفقیت ایجاد شد.' });
      await fetchBackups();
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
    }
  };

  const handleDownloadBackupFile = async (fileName: string) => {
    try {
      const res = await apiFetch(`/api/backup/download/${encodeURIComponent(fileName)}`);
      if (!res.ok) throw new Error('خطا در دانلود بکاپ');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
    }
  };

  const handleDeleteBackupFile = async (fileName: string) => {
    if (!confirm('بکاپ حذف شود؟')) return;
    try {
      const res = await apiFetch(`/api/backup/${encodeURIComponent(fileName)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'خطا در حذف بکاپ');
      setNotification({ type: 'success', text: 'بکاپ حذف شد.' });
      await fetchBackups();
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
    }
  };

  const handleRestoreFromBackup = async (fileName: string) => {
    if (!confirm('این کار اطلاعات فعلی را جایگزین می‌کند. ادامه می‌دهید؟')) return;
    setIsRestoringDb(true);
    try {
      const res = await apiFetch('/api/backup/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName }) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'خطا در بازیابی');
      setNotification({ type: 'success', text: data.message });
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
    } finally {
      setIsRestoringDb(false);
    }
  };

  const handleTestRestore = async (fileName: string) => {
    try {
      const res = await apiFetch('/api/backup/test-restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName }) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'خطا در تست');
      const s = data.data?.stats;
      setNotification({ type: 'success', text: `تست بکاپ موفق بود. invoices=${s?.invoices ?? '-'} products=${s?.products ?? '-'} customers=${s?.customers ?? '-'} items=${s?.invoice_items ?? '-'}` });
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
    }
  };

  const handleSaveBackupSchedule = async () => {
    try {
      const payload: any = {
        backup_enabled: backupEnabled ? '1' : '0',
        backup_cron: backupCron,
        backup_timezone: backupTimezone,
        backup_retention: String(backupRetention),
      };
      const res = await apiFetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'خطا در ذخیره تنظیمات بکاپ');
      setNotification({ type: 'success', text: 'تنظیمات بکاپ ذخیره شد. (برای اعمال زمان‌بندی ممکن است ریستارت سرور لازم باشد.)' });
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
    }
  };

  // ------- Backup/Restore
  const handleBackup = async () => {
    setNotification({ type: 'info', text: 'در حال آماده‌سازی فایل پشتیبان...' });
    try {
      const response = await apiFetch('/api/settings/backup');
      if (!response.ok) throw new Error((await response.json()).message || 'خطا در دانلود');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kourosh_dashboard_backup_${new Date().toISOString().split('T')[0]}.db`;
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setNotification({ type: 'success', text: 'فایل پشتیبان با موفقیت دانلود شد.' });
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    }
  };

  const handleDbFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.split('.').pop()?.toLowerCase() !== 'db') {
        setNotification({ type: 'error', text: 'فایل انتخاب شده باید با فرمت .db باشد.' });
        if (dbFileInputRef.current) dbFileInputRef.current.value = '';
        setDbFile(null);
        return;
      }
      setDbFile(file);
      setIsRestoreModalOpen(true);
    }
  };

  const handleRestore = async () => {
    if (!dbFile) return;
    setIsRestoreModalOpen(false);
    setIsRestoringDb(true);
    const formData = new FormData();
    formData.append('dbfile', dbFile);
    try {
      const response = await apiFetch('/api/settings/restore', { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setNotification({
        type: 'success',
        text: result.message + ' لطفاً برای اعمال تغییرات، برنامه را ببندید و مجدداً باز کنید.',
      });
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsRestoringDb(false);
      setDbFile(null);
      if (dbFileInputRef.current) dbFileInputRef.current.value = '';
    }
  };

  // ------- Users
  const openAddUserModal = () => {
    setAddUserFormErrors({});
    setNewUser(initialNewUserState);
    setIsAddUserModalOpen(true);
  };
  const handleNewUserChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewUser(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleNewUserSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errors: Partial<NewUserFormData> = {};
    if (!newUser.username.trim()) errors.username = 'نام کاربری الزامی است.';
    if (!newUser.password) errors.password = 'کلمه عبور الزامی است.';
    else if (newUser.password.length < 6) errors.password = 'کلمه عبور باید حداقل ۶ کاراکتر باشد.';
    if (newUser.password !== newUser.confirmPassword) errors.confirmPassword = 'کلمه عبور و تکرار آن یکسان نیستند.';
    if (Object.keys(errors).length > 0) {
      setAddUserFormErrors(errors);
      return;
    }

    setIsSavingUser(true);
    try {
      await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(newUser) });
      setNotification({ type: 'success', text: 'کاربر با موفقیت ایجاد شد.' });
      setIsAddUserModalOpen(false);
      fetchData();
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsSavingUser(false);
    }
  };

  const openEditUserModal = (user: UserForDisplay) => {
    setEditingUser({ id: user.id, username: user.username, roleId: user.roleId });
    setEditUserFormErrors({});
    setIsEditUserModalOpen(true);
  };
  const handleEditUserChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (editingUser) setEditingUser(prev => (prev ? { ...prev, [e.target.name]: e.target.value } : null));
  };
  const handleEditUserSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsUpdatingUser(true);
    try {
      await apiFetch(`/api/users/${editingUser.id}`, { method: 'PUT', body: JSON.stringify({ roleId: Number(editingUser.roleId) }) });
      setNotification({ type: 'success', text: 'نقش کاربر ویرایش شد.' });
      setIsEditUserModalOpen(false);
      fetchData();
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const openResetPasswordModal = (user: UserForDisplay) => {
    setResettingUser(user);
    setResetPasswordData({ password: '', confirmPassword: '' });
    setResetPasswordErrors({});
    setIsResetPasswordModalOpen(true);
  };
  const handleResetPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    if (resetPasswordData.password.length < 6) {
      setResetPasswordErrors({ password: 'کلمه عبور باید حداقل ۶ کاراکتر باشد.' });
      return;
    }
    if (resetPasswordData.password !== resetPasswordData.confirmPassword) {
      setResetPasswordErrors({ confirmPassword: 'کلمه‌های عبور یکسان نیستند.' });
      return;
    }

    setIsSubmittingReset(true);
    try {
      await apiFetch(`/api/users/${resettingUser.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password: resetPasswordData.password }),
      });
      setNotification({ type: 'success', text: `کلمه عبور کاربر ${resettingUser.username} بازنشانی شد.` });
      setIsResetPasswordModalOpen(false);
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const openDeleteUserModal = (user: UserForDisplay) => {
    setDeletingUser(user);
    setIsDeleteUserModalOpen(true);
  };
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeletingUser(true);
    try {
      await apiFetch(`/api/users/${deletingUser.id}`, { method: 'DELETE' });
      setNotification({ type: 'success', text: `کاربر ${deletingUser.username} حذف شد.` });
      setIsDeleteUserModalOpen(false);
      fetchData();
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsDeletingUser(false);
    }
  };


  // ---- Account handlers
  const handleMeAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setMeAvatarFile(f);
    if (!f) {
      setMeAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(f);
    setMeAvatarPreview(url);
  };

  const handleMeAvatarUpload = async () => {
    if (!meAvatarFile) return;
    setIsUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('avatar', meAvatarFile);
      const res = await apiFetch('/api/me/upload-avatar', { method: 'POST', body: fd });
      if (!res?.success) throw new Error(res?.message || 'آپلود آواتار ناموفق بود.');
      const avatarUrl = res?.data?.avatarUrl;
      if (avatarUrl) updateCurrentUser({ avatarUrl });
      setNotification({ type: 'success', text: res?.message || 'آواتار با موفقیت آپلود شد.' });
      setMeAvatarFile(null);
      setMeAvatarPreview(null);
      if (meAvatarInputRef.current) meAvatarInputRef.current.value = '';
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'خطا در آپلود آواتار.' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleChangeMyPassword = async () => {
    if (!oldPassword || !newPassword || !newPassword2) {
      setNotification({ type: 'error', text: 'همه فیلدهای کلمه عبور را کامل کنید.' });
      return;
    }
    if (newPassword.length < 6) {
      setNotification({ type: 'error', text: 'کلمه عبور جدید باید حداقل ۶ کاراکتر باشد.' });
      return;
    }
    if (newPassword !== newPassword2) {
      setNotification({ type: 'error', text: 'تکرار کلمه عبور جدید با هم برابر نیست.' });
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await apiFetch('/api/me/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      if (!res?.success) throw new Error(res?.message || 'تغییر کلمه عبور ناموفق بود.');
      setNotification({ type: 'success', text: res?.message || 'کلمه عبور با موفقیت تغییر کرد.' });
      setOldPassword('');
      setNewPassword('');
      setNewPassword2('');
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'خطا در تغییر کلمه عبور.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ---- UI helpers
  const infoChanged = JSON.stringify(businessInfo) !== JSON.stringify(initialBusinessInfo);
  const isAdmin = (currentUser?.roleName === 'Admin');
  // Use brand colors for labels, inputs and fieldsets
  const labelClass = 'block text-sm font-medium text-text mb-2';
  const inputClass =
    'w-full p-2 border rounded-md bg-white dark:bg-black/30 border-primary/20 focus:ring-2 focus:ring-primary focus:border-primary text-right';
  const fieldsetLegendClass = 'px-2 text-base font-semibold text-text';
  const fieldsetClass = 'border border-primary/10 rounded-lg p-4 mt-6';

  if (isLoading) {
    return (
      <PageShell title="تنظیمات" description="پیکربندی سیستم، کاربران و تنظیمات کسب‌وکار." icon={<i className="fa-solid fa-gear" />}>
        <div className="p-10 text-center text-gray-500">
        <i className="fas fa-spinner fa-spin text-3xl mb-3" />
        <p>در حال بارگذاری تنظیمات...</p>
      </div>
      </PageShell>
    );
  }


  return (
    <PageShell title="تنظیمات" description="پیکربندی سیستم، کاربران و تنظیمات کسب‌وکار." icon={<i className="fa-solid fa-gear" />}>
    <div className="space-y-8 text-right max-w-7xl mx-auto px-4" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      {/* Premium Settings Layout */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-surface/80 backdrop-blur border-b border-primary/10 print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <i className="fa-solid fa-gear" />
            </div>
            <div className="leading-tight">
              <div className="text-lg font-extrabold text-text">تنظیمات</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">کنترل سیستم، پیام‌رسانی، ظاهر و داده‌ها</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs border ${
                infoChanged
                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800'
              }`}
              title={infoChanged ? 'تغییرات ذخیره نشده دارید' : 'همه چیز ذخیره است'}
            >
              {infoChanged ? 'تغییرات ذخیره نشده' : 'ذخیره شده'}
            </span>

            <button
              type="button"
              onClick={() => {
                setBusinessInfo(initialBusinessInfo);
                setLogoFile(null);
              }}
              disabled={!infoChanged || isSaving}
              className="px-3 py-2 text-sm rounded-lg border border-primary/15 hover:bg-primary/5 disabled:opacity-50 transition"
            >
              بازگشت
            </button>

            <button
              type="button"
              onClick={() => {
                const form = document.getElementById('settings-form') as HTMLFormElement | null;
                if (tab === 'business' && form) form.requestSubmit();
                if (tab === 'sms') handleBusinessInfoSubmit();
                if (tab === 'telegram') handleTelegramSettingsSubmit();
              }}
              disabled={!infoChanged || isSaving}
              className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:brightness-110 disabled:opacity-50 transition shadow"
            >
              {isSaving ? 'در حال ذخیره…' : 'ذخیره'}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile quick tabs */}
      <div className="lg:hidden -mx-4 px-4 pt-4 pb-2 overflow-x-auto print:hidden">
        <div className="flex gap-2 min-w-max">
          {([
            { k: 'account', icon: 'fa-solid fa-user-shield', text: 'حساب' },
            { k: 'business', icon: 'fa-solid fa-store', text: 'کسب‌وکار' },
            { k: 'sms', icon: 'fa-solid fa-message', text: 'پیامک' },
            { k: 'telegram', icon: 'fa-brands fa-telegram', text: 'تلگرام' },
            { k: 'style', icon: 'fa-solid fa-wand-magic-sparkles', text: 'استایل' },
            { k: 'users', icon: 'fa-solid fa-users', text: 'کاربران' },
            { k: 'data', icon: 'fa-solid fa-database', text: 'داده‌ها' },
          ] as { k: TabKey; icon: string; text: string }[]).filter(({ k }) => isAdmin || k === 'account').map(({ k, icon, text }) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-3 py-2 rounded-full text-sm border transition ${
                tab === k
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-text border-primary/10 hover:bg-primary/5'
              }`}
            >
              <i className={`${icon} ml-2`} />
              {text}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-6 mt-4">
        {/* Sidebar */}
        <aside className="hidden lg:block bg-surface rounded-2xl border border-primary/10 shadow-lg p-3 h-fit sticky top-[84px] print:hidden">
          <div className="px-3 py-2">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">پیکربندی</div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="px-3 py-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400">عمومی</div>
              <div className="space-y-1">
                {([
                  { k: 'account', icon: 'fa-solid fa-user-shield', text: 'حساب کاربری', sub: 'پروفایل و امنیت' },
                  { k: 'business', icon: 'fa-solid fa-store', text: 'اطلاعات کسب‌وکار', sub: 'نام فروشگاه، لوگو، تماس…' },
                  { k: 'users', icon: 'fa-solid fa-users', text: 'کاربران و نقش‌ها', sub: 'مدیریت دسترسی‌ها' },
                ] as { k: TabKey; icon: string; text: string; sub: string }[]).filter(({ k }) => isAdmin || k === 'account').map(({ k, icon, text, sub }) => (
                  <button
                    key={k}
                    onClick={() => setTab(k)}
                    className={`w-full text-right rounded-xl px-3 py-2 transition border ${
                      tab === k ? 'bg-primary/10 border-primary/30 text-text' : 'border-transparent hover:border-primary/10 hover:bg-primary/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                        tab === k ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                      }`}>
                        <i className={icon} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{text}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {isAdmin && (
            <div>
              <div className="px-3 py-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400">پیام‌رسانی</div>
              <div className="space-y-1">
                {([
                  { k: 'sms', icon: 'fa-solid fa-message', text: 'پیامک (Pattern)', sub: 'ملی‌پیامک و الگوها' },
                  { k: 'telegram', icon: 'fa-brands fa-telegram', text: 'تلگرام', sub: 'قالب‌ها و ارسال' },
                ] as { k: TabKey; icon: string; text: string; sub: string }[]).map(({ k, icon, text, sub }) => (
                  <button
                    key={k}
                    onClick={() => setTab(k)}
                    className={`w-full text-right rounded-xl px-3 py-2 transition border ${
                      tab === k ? 'bg-primary/10 border-primary/30 text-text' : 'border-transparent hover:border-primary/10 hover:bg-primary/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                        tab === k ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                      }`}>
                        <i className={icon} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{text}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            )}

            {isAdmin && (
            <div>
              <div className="px-3 py-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400">سیستم</div>
              <div className="space-y-1">
                {([
                  { k: 'style', icon: 'fa-solid fa-wand-magic-sparkles', text: 'ظاهر و استایل', sub: 'تم، رنگ، چیدمان' },
                  { k: 'data', icon: 'fa-solid fa-database', text: 'مدیریت داده‌ها', sub: 'Backup/Restore و خروجی' },
                ] as { k: TabKey; icon: string; text: string; sub: string }[]).map(({ k, icon, text, sub }) => (
                  <button
                    key={k}
                    onClick={() => setTab(k)}
                    className={`w-full text-right rounded-xl px-3 py-2 transition border ${
                      tab === k ? 'bg-primary/10 border-primary/30 text-text' : 'border-transparent hover:border-primary/10 hover:bg-primary/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                        tab === k ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                      }`}>
                        <i className={icon} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{text}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            )}
          </div>

          {isAdmin && (
          <div className="mt-4 pt-3 border-t border-primary/10 px-3">
            <Link
              to="/audit-log"
              className="flex items-center justify-between px-3 py-2 rounded-xl border border-primary/10 hover:bg-primary/5 transition text-sm"
            >
              <span className="flex items-center gap-2">
                <i className="fa-solid fa-clipboard-list text-primary" />
                گزارش فعالیت‌ها
              </span>
              <i className="fa-solid fa-chevron-left text-xs opacity-60" />
            </Link>
          </div>
          )}
        </aside>

        {/* Main */}
        <section className="bg-surface rounded-2xl border border-primary/10 shadow-lg overflow-hidden">
          <div className="p-6 lg:p-8">

          {!isAdmin && tab !== 'account' && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-900/20 p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-200 flex items-center justify-center">
                  <i className="fa-solid fa-lock" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-amber-900 dark:text-amber-100">دسترسی محدود</div>
                  <div className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-1">
                    برای امنیت سیستم، این بخش‌ها فقط برای مدیر (Admin) فعال است. شما می‌توانید از تب «حساب کاربری» پروفایل و امنیت حساب خود را مدیریت کنید.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTab('account')}
                  className="px-3 py-2 text-sm rounded-xl bg-amber-600 text-white hover:brightness-110 transition"
                >
                  رفتن به حساب
                </button>
              </div>
            </div>
          )}

          {tab === 'account' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-primary/10">
                <div>
                  <h2 className="text-xl font-extrabold text-text">حساب کاربری</h2>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">پروفایل، امنیت و تنظیمات شخصی</div>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setTab('users')}
                    className="px-3 py-2 text-sm rounded-xl border border-primary/15 hover:bg-primary/5 transition"
                  >
                    <i className="fa-solid fa-users ml-2" />
                    مدیریت کاربران
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-primary/10 bg-surface shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-text">پروفایل</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">آواتار و اطلاعات حساب</div>
                    </div>
                    <span className="px-2 py-1 rounded-full text-[11px] border border-primary/15 bg-primary/5 text-primary">
                      {currentUser?.roleName || '—'}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <div className="h-20 w-20 rounded-2xl border border-primary/10 overflow-hidden bg-primary/5 flex items-center justify-center">
                      {meAvatarPreview ? (
                        <img src={meAvatarPreview} className="h-full w-full object-cover" alt="" />
                      ) : currentUser?.avatarUrl ? (
                        <img src={currentUser.avatarUrl} className="h-full w-full object-cover" alt="" />
                      ) : (
                        <i className="fa-solid fa-user text-primary/70 text-2xl" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-text truncate">{currentUser?.username || '—'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">شناسه: {currentUser?.id ?? '—'}</div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <input
                          ref={meAvatarInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleMeAvatarChange}
                        />
                        <button
                          type="button"
                          onClick={() => meAvatarInputRef.current?.click()}
                          className="px-3 py-2 text-sm rounded-xl border border-primary/15 hover:bg-primary/5 transition"
                        >
                          انتخاب آواتار
                        </button>

                        <button
                          type="button"
                          disabled={!meAvatarFile || isUploadingAvatar}
                          onClick={handleMeAvatarUpload}
                          className="px-3 py-2 text-sm rounded-xl bg-primary text-white hover:brightness-110 disabled:opacity-50 transition"
                        >
                          {isUploadingAvatar ? 'در حال آپلود…' : 'آپلود'}
                        </button>
                      </div>

                      <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                        حداکثر ۲ مگابایت • فرمت‌های تصویر (jpg/png/webp)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-primary/10 bg-surface shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-text">امنیت</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">تغییر کلمه عبور حساب</div>
                    </div>
                    <span className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <i className="fa-solid fa-shield-halved" />
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4">
                    <div>
                      <label className={labelClass}>کلمه عبور فعلی</label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className={inputClass}
                        dir="ltr"
                        autoComplete="current-password"
                      />
                    </div>

                    <div>
                      <label className={labelClass}>کلمه عبور جدید</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={inputClass}
                        dir="ltr"
                        autoComplete="new-password"
                      />
                      <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">حداقل ۶ کاراکتر</div>
                    </div>

                    <div>
                      <label className={labelClass}>تکرار کلمه عبور جدید</label>
                      <input
                        type="password"
                        value={newPassword2}
                        onChange={(e) => setNewPassword2(e.target.value)}
                        className={inputClass}
                        dir="ltr"
                        autoComplete="new-password"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleChangeMyPassword}
                      disabled={isChangingPassword}
                      className="mt-2 px-4 py-2 rounded-xl bg-gray-900 text-white hover:opacity-95 disabled:opacity-60 transition"
                    >
                      {isChangingPassword ? 'در حال تغییر…' : 'تغییر کلمه عبور'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'business' && (
            <form id="settings-form" onSubmit={handleBusinessInfoSubmit}>
                            <div className="flex items-start justify-between gap-3 mb-5 pb-4 border-b border-primary/10">
                <div>
                  <h2 className="text-xl font-extrabold text-text">اطلاعات کسب‌وکار</h2>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">نام فروشگاه، اطلاعات تماس، آدرس و هویت برند</div>
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs border border-primary/15 bg-primary/5 text-primary">
                    <i className="fa-solid fa-badge-check ml-2" />
                    پروفایل فروشگاه
                  </span>
                </div>
              </div>

              <div className="mb-6 rounded-2xl border border-primary/10 bg-surface shadow-sm p-5">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl border border-primary/10 overflow-hidden bg-primary/5 flex items-center justify-center">
                    {logoPreview ? (
                      <img src={logoPreview} className="h-full w-full object-contain" alt="" />
                    ) : (
                      <i className="fa-solid fa-store text-primary/70 text-xl" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-text truncate">{businessInfo.store_name || 'نام فروشگاه تنظیم نشده'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {businessInfo.store_phone ? `☎️ ${businessInfo.store_phone}` : 'تلفن ثبت نشده'}
                      {businessInfo.store_email ? ` • ${businessInfo.store_email}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={logoInputRefClick}
                      className="px-3 py-2 text-sm rounded-xl border border-primary/15 hover:bg-primary/5 transition"
                    >
                      <i className="fa-solid fa-image ml-2" />
                      انتخاب لوگو
                    </button>
                    <button
                      type="button"
                      onClick={handleLogoUpload}
                      disabled={!logoFile || isUploadingLogo}
                      className="px-3 py-2 text-sm rounded-xl bg-primary text-white hover:brightness-110 disabled:opacity-50 transition"
                    >
                      {isUploadingLogo ? 'آپلود…' : 'آپلود'}
                    </button>
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
                  لوگو در هدر، سایدبار و خروجی‌های چاپی استفاده می‌شود. اندازه پیشنهادی: 512×512
                </div>
              </div>

              <fieldset className={fieldsetClass}>
                <legend className={fieldsetLegendClass}>اطلاعات کسب‌وکار</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <label htmlFor="store_name" className={labelClass}>نام فروشگاه</label>
                    <input type="text" id="store_name" name="store_name" value={businessInfo.store_name || ''} onChange={handleBusinessInfoChange} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="store_phone" className={labelClass}>تلفن فروشگاه</label>
                    <input type="text" id="store_phone" name="store_phone" value={businessInfo.store_phone || ''} onChange={handleBusinessInfoChange} className={inputClass} dir="ltr" />
                  </div>
                  <div>
                    <label htmlFor="store_email" className={labelClass}>ایمیل فروشگاه</label>
                    <input type="email" id="store_email" name="store_email" value={businessInfo.store_email || ''} onChange={handleBusinessInfoChange} className={inputClass} dir="ltr" />
                  </div>

                  <div>
                    <label htmlFor="qr_public_base_url" className={labelClass}>
                      آدرس سایت عمومی برای QR Code
                    </label>
                    <input
                      type="url"
                      id="qr_public_base_url"
                      name="qr_public_base_url"
                      value={businessInfo.qr_public_base_url || ''}
                      onChange={handleBusinessInfoChange}
                      className={inputClass}
                      dir="ltr"
                      placeholder="https://your-public-site.com"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      این آدرس در QR فاکتور/رسید استفاده می‌شود (مثلاً برای نمایش آنلاین فاکتور).
                    </p>
                  </div>
                  <div>
                    <label htmlFor="store_address_line1" className={labelClass}>آدرس - خط ۱</label>
                    <input type="text" id="store_address_line1" name="store_address_line1" value={businessInfo.store_address_line1 || ''} onChange={handleBusinessInfoChange} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="store_address_line2" className={labelClass}>آدرس - خط ۲</label>
                    <input type="text" id="store_address_line2" name="store_address_line2" value={businessInfo.store_address_line2 || ''} onChange={handleBusinessInfoChange} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="store_city_state_zip" className={labelClass}>شهر، استان، کدپستی</label>
                    <input type="text" id="store_city_state_zip" name="store_city_state_zip" value={businessInfo.store_city_state_zip || ''} onChange={handleBusinessInfoChange} className={inputClass} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>لوگوی فروشگاه</label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center overflow-hidden border dark:border-gray-600">
                        {logoPreview ? <img src={logoPreview} alt="" className="w-full h-full object-contain" /> : <i className="fa-solid fa-image text-gray-400" />}
                      </div>
                      <input type="file" ref={logoInputRef} onChange={handleLogoFileChange} accept="image/*" className="hidden" />
                      <button type="button" onClick={logoInputRefClick} className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
                        انتخاب فایل
                      </button>
                      {logoFile && (
                        <button type="button" onClick={handleLogoUpload} disabled={isUploadingLogo} className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-green-300">
                          {isUploadingLogo ? 'درحال آپلود...' : 'آپلود'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </fieldset>

              <div className="mt-8 flex justify-end">
                <button type="submit" disabled={!infoChanged || isSaving} className="px-6 py-2 bg-primary text-white rounded-lg hover:brightness-110 disabled:opacity-60">
                  {isSaving ? 'در حال ذخیره...' : 'ذخیره اطلاعات کسب‌وکار'}
                </button>
              </div>
            </form>
          )}

          {tab === 'sms' && (
            <div>
              <fieldset className={fieldsetClass}>
                <legend className={fieldsetLegendClass}>تنظیمات پنل پیامک</legend>
                {/* Select SMS provider */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className={labelClass}>سرویس دهنده پیامک</label>
                    <select
                      name="sms_provider"
                      value={businessInfo.sms_provider || 'meli_payamak'}
                      onChange={handleBusinessInfoChange}
                      className={inputClass}
                    >
                      <option value="meli_payamak">ملی پیامک</option>
                      <option value="kavenegar">کاوه‌نگار</option>
                      <option value="sms_ir">SMS.ir</option>
                      <option value="ippanel">IPPANEL</option>
                    </select>
                  </div>
                </div>
                
                {/* --- Auto Send Rules (Queue/Scheduler) --- */}
                <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <i className="fa-solid fa-robot" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">ارسال خودکار یادآوری‌ها (روزانه ساعت ۹)</div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">هر کدام را می‌توانید خاموش/فقط پیامک/فقط تلگرام/هر دو تنظیم کنید. (ارسال با صف و تلاش مجدد انجام می‌شود.)</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>یادآوری اقساط (۷/۳/امروز)</label>
                      <select name="auto_send_installment_due" value={(businessInfo as any).auto_send_installment_due || 'off'} onChange={handleBusinessInfoChange} className={inputClass}>
                        <option value="off">خاموش</option>
                        <option value="sms">فقط پیامک</option>
                        <option value="telegram">فقط تلگرام</option>
                        <option value="both">هر دو</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>یادآوری چک‌ها (۷/۳/امروز)</label>
                      <select name="auto_send_check_due" value={(businessInfo as any).auto_send_check_due || 'off'} onChange={handleBusinessInfoChange} className={inputClass}>
                        <option value="off">خاموش</option>
                        <option value="sms">فقط پیامک</option>
                        <option value="telegram">فقط تلگرام</option>
                        <option value="both">هر دو</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>تعمیرات آماده تحویل</label>
                      <select name="auto_send_repair_ready" value={(businessInfo as any).auto_send_repair_ready || 'off'} onChange={handleBusinessInfoChange} className={inputClass}>
                        <option value="off">خاموش</option>
                        <option value="sms">فقط پیامک</option>
                        <option value="telegram">فقط تلگرام</option>
                        <option value="both">هر دو</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    نکته: اگر در یک روز یک رویداد برای یک مشتری چند بار تشخیص داده شود، سیستم به صورت خودکار تکراری‌ها را حذف می‌کند.
                  </div>
                </div>

{/* Fields for Meli Payamak */}
                {(!businessInfo.sms_provider || businessInfo.sms_provider === 'meli_payamak') && (
                  <>

						{/* --- MeliPayamak: Pattern IDs (BodyId) دسته‌بندی‌شده + ارسال تست */}
						{(() => {
							const PatternRow = ({
								keyName,
								label,
								tokens,
								previewTemplate,
								description,
								accent,
								iconClass,
							}: {
								keyName: keyof BusinessInformationSettings;
								label: string;
								tokens: string[];
								previewTemplate: string;
								description?: string;
								accent: 'emerald' | 'blue' | 'amber' | 'gray';
								iconClass: string;
							}) => {
								const val = String((businessInfo as any)[keyName] || '');
								const active = !!val.trim();
								const tone = accent;
								const borderCls =
									tone === 'emerald'
										? 'border-l-4 border-emerald-500'
										: tone === 'blue'
											? 'border-l-4 border-blue-500'
											: tone === 'amber'
												? 'border-l-4 border-amber-500'
												: 'border-l-4 border-gray-300 dark:border-gray-600';
								const badgeCls = active
									? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200'
									: 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200';
								return (
									<div className={`rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-white/60 dark:bg-gray-800/40 ${borderCls}`}>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<div className="flex items-center gap-2">
													<span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
														<i className={iconClass} />
													</span>
													<div className="min-w-0">
														<div className="font-semibold text-gray-900 dark:text-gray-100 truncate">{label}</div>
														<div className="mt-1 flex items-center gap-2 flex-wrap">
															<span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${badgeCls}`}>
																<i className={active ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'} />
																{active ? 'فعال' : 'غیرفعال'}
															</span>
															<span className="app-subtle text-xs">متغیرها: {tokens.join('، ')}</span>
														</div>
													</div>
												</div>
												{description ? <div className="app-subtle mt-1">{description}</div> : null}
											</div>
										<div className="shrink-0 flex items-center gap-2">
											<button
												type="button"
												onClick={() => openSmsPatternPreview(`پیش‌نمایش: ${label}`, previewTemplate, tokens)}
												className="px-3 py-2 rounded-xl bg-blue-50 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-200 dark:hover:bg-blue-900/30 border border-blue-200/60 dark:border-blue-900/30"
											>
												<i className="fa-regular fa-eye ml-1" />
												پیش‌نمایش
											</button>
											<button
												type="button"
												disabled={!val}
												onClick={() => openSmsPatternTest(`تست پیامک: ${label}`, val, tokens)}
												className="px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
											>
												<i className="fa-solid fa-paper-plane ml-1" />
												ارسال تست
											</button>
										</div>
										</div>

										<div className="mt-3">
											<label className={labelClass}>شناسه پترن (BodyId)</label>
											<input
												type="text"
												id={String(keyName)}
												name={String(keyName)}
												value={val}
												onChange={handleBusinessInfoChange as any}
												className={inputClass}
												dir="ltr"
											/>
											<div className="mt-2 text-xs app-subtle">
												<i className="fa-solid fa-wand-magic-sparkles ml-1" />
												نکته: این شناسه باید دقیقاً از پنل ملی‌پیامک (پترن/متن تاییدشده) برداشته شود.
										</div>
										</div>
									</div>
								);
							};

							// استفاده از پترن‌های مرکزی
							const meliPatterns = meliPatternDefs;

							return (
								<div className="mt-4 space-y-6">
									<FormSection
										title="راهنما"
										description="در ملی‌پیامک، پیامک‌های پترنی از طریق متد SendByBaseNumber ارسال می‌شوند. برای هر رویداد یک BodyId تعریف کنید و متغیرها را به همان ترتیبِ پترن وارد کنید."
										iconClass="fa-solid fa-circle-info"
										iconColor="#3b82f6"
									>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
											<div>
												<label className={labelClass}>نام کاربری ملی پیامک</label>
												<input type="text" id="meli_payamak_username" name="meli_payamak_username" value={businessInfo.meli_payamak_username || ''} onChange={handleBusinessInfoChange} className={inputClass} dir="ltr" />
											</div>
											<div>
												<label className={labelClass}>کلمه عبور ملی پیامک</label>
												<input type="password" id="meli_payamak_password" name="meli_payamak_password" value={businessInfo.meli_payamak_password || ''} onChange={handleBusinessInfoChange} className={inputClass} dir="ltr" />
											</div>
										</div>
									</FormSection>

									<SmsHealthCheckPanel
										patterns={meliPatterns}
										onOpenBulkTest={(keys) => {
											setSmsBulkDefaults(keys);
											setSmsBulkOpen(true);
										}}
									/>

									<FormSection title="اقساط" description="پیامک‌های مربوط به اقساط و پرداخت‌ها" iconClass="fa-solid fa-money-check-dollar" iconColor="#10b981">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											{meliPatterns.filter((p) => p.category === 'اقساط').map((p) => (
												<PatternRow
													key={p.key}
													accent={p.accent as any}
													iconClass={p.iconClass || 'fa-solid fa-message'}
													keyName={p.key as any}
													label={p.label}
													tokens={p.tokens}
													previewTemplate={p.previewTemplate || ''}
												/>
											))}
										</div>
									</FormSection>

									<FormSection title="تعمیرات" description="پیامک‌های چرخه تعمیر (پذیرش، برآورد، آماده تحویل)" iconClass="fa-solid fa-screwdriver-wrench" iconColor="#3b82f6">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											{meliPatterns.filter((p) => p.category === 'تعمیرات').map((p) => (
												<PatternRow
													key={p.key}
													accent={p.accent as any}
													iconClass={p.iconClass || 'fa-solid fa-message'}
													keyName={p.key as any}
													label={p.label}
													tokens={p.tokens}
													previewTemplate={p.previewTemplate || ''}
												/>
											))}
										</div>
									</FormSection>

									<FormSection title="چک‌ها" description="یادآوری سررسید چک‌ها" iconClass="fa-solid fa-file-invoice-dollar" iconColor="#f59e0b">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											{meliPatterns.filter((p) => p.category === 'چک‌ها').map((p) => (
												<PatternRow
													key={p.key}
													accent={p.accent as any}
													iconClass={p.iconClass || 'fa-solid fa-message'}
													keyName={p.key as any}
													label={p.label}
													tokens={p.tokens}
													previewTemplate={p.previewTemplate || ''}
												/>
											))}
										</div>
									</FormSection>
								</div>
							);
						})()}
                  </>
                )}
                {/* Fields for Kavenegar */}
                {businessInfo.sms_provider === 'kavenegar' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="kavenegar_api_key" className={labelClass}>کلید API کاوه‌نگار</label>
                        <input
                          type="text"
                          id="kavenegar_api_key"
                          name="kavenegar_api_key"
                          value={businessInfo.kavenegar_api_key || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                    {/* Kavenegar templates for installment due reminders */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="kavenegar_installment_due_7_template" className={labelClass}>نام قالب قسط - ۷ روز قبل</label>
                        <input
                          type="text"
                          id="kavenegar_installment_due_7_template"
                          name="kavenegar_installment_due_7_template"
                          value={businessInfo.kavenegar_installment_due_7_template || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="kavenegar_installment_due_3_template" className={labelClass}>نام قالب قسط - ۳ روز قبل</label>
                        <input
                          type="text"
                          id="kavenegar_installment_due_3_template"
                          name="kavenegar_installment_due_3_template"
                          value={businessInfo.kavenegar_installment_due_3_template || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="kavenegar_installment_due_today_template" className={labelClass}>نام قالب قسط - همان روز</label>
                        <input
                          type="text"
                          id="kavenegar_installment_due_today_template"
                          name="kavenegar_installment_due_today_template"
                          value={businessInfo.kavenegar_installment_due_today_template || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                    {/* Kavenegar templates for check due reminders */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="kavenegar_check_due_7_template" className={labelClass}>نام قالب چک - ۷ روز قبل</label>
                        <input
                          type="text"
                          id="kavenegar_check_due_7_template"
                          name="kavenegar_check_due_7_template"
                          value={businessInfo.kavenegar_check_due_7_template || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="kavenegar_check_due_3_template" className={labelClass}>نام قالب چک - ۳ روز قبل</label>
                        <input
                          type="text"
                          id="kavenegar_check_due_3_template"
                          name="kavenegar_check_due_3_template"
                          value={businessInfo.kavenegar_check_due_3_template || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="kavenegar_check_due_today_template" className={labelClass}>نام قالب چک - همان روز</label>
                        <input
                          type="text"
                          id="kavenegar_check_due_today_template"
                          name="kavenegar_check_due_today_template"
                          value={businessInfo.kavenegar_check_due_today_template || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="kavenegar_installment_template" className={labelClass}>نام قالب یادآوری قسط</label>
                        <input
                          type="text"
                          id="kavenegar_installment_template"
                          name="kavenegar_installment_template"
                          value={businessInfo.kavenegar_installment_template || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="kavenegar_installment_completed_template" className={labelClass}>نام قالب تسویه کامل اقساط (پرداخت نهایی)</label>
                        <input
                          type="text"
                          id="kavenegar_installment_completed_template"
                          name="kavenegar_installment_completed_template"
                          value={businessInfo.kavenegar_installment_completed_template || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="kavenegar_repair_received_template" className={labelClass}>نام قالب تحویل تعمیر</label>
                        <input
                          type="text"
                          id="kavenegar_repair_received_template"
                          name="kavenegar_repair_received_template"
                          value={businessInfo.kavenegar_repair_received_template || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="kavenegar_repair_cost_estimated_template" className={labelClass}>نام قالب برآورد هزینه تعمیر</label>
                        <input
                          type="text"
                          id="kavenegar_repair_cost_estimated_template"
                          name="kavenegar_repair_cost_estimated_template"
                          value={businessInfo.kavenegar_repair_cost_estimated_template || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="kavenegar_repair_ready_template" className={labelClass}>نام قالب آماده تحویل تعمیر</label>
                        <input
                          type="text"
                          id="kavenegar_repair_ready_template"
                          name="kavenegar_repair_ready_template"
                          value={businessInfo.kavenegar_repair_ready_template || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </>
                )}
                {/* Fields for SMS.ir */}
                {businessInfo.sms_provider === 'sms_ir' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="sms_ir_api_key" className={labelClass}>کلید API SMS.ir</label>
                        <input
                          type="text"
                          id="sms_ir_api_key"
                          name="sms_ir_api_key"
                          value={businessInfo.sms_ir_api_key || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                    {/* SMS.ir templates for installment due reminders */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="sms_ir_installment_due_7_template_id" className={labelClass}>شناسه قالب قسط - ۷ روز قبل</label>
                        <input
                          type="text"
                          id="sms_ir_installment_due_7_template_id"
                          name="sms_ir_installment_due_7_template_id"
                          value={businessInfo.sms_ir_installment_due_7_template_id || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="sms_ir_installment_due_3_template_id" className={labelClass}>شناسه قالب قسط - ۳ روز قبل</label>
                        <input
                          type="text"
                          id="sms_ir_installment_due_3_template_id"
                          name="sms_ir_installment_due_3_template_id"
                          value={businessInfo.sms_ir_installment_due_3_template_id || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="sms_ir_installment_due_today_template_id" className={labelClass}>شناسه قالب قسط - همان روز</label>
                        <input
                          type="text"
                          id="sms_ir_installment_due_today_template_id"
                          name="sms_ir_installment_due_today_template_id"
                          value={businessInfo.sms_ir_installment_due_today_template_id || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                    {/* SMS.ir templates for check due reminders */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="sms_ir_check_due_7_template_id" className={labelClass}>شناسه قالب چک - ۷ روز قبل</label>
                        <input
                          type="text"
                          id="sms_ir_check_due_7_template_id"
                          name="sms_ir_check_due_7_template_id"
                          value={businessInfo.sms_ir_check_due_7_template_id || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="sms_ir_check_due_3_template_id" className={labelClass}>شناسه قالب چک - ۳ روز قبل</label>
                        <input
                          type="text"
                          id="sms_ir_check_due_3_template_id"
                          name="sms_ir_check_due_3_template_id"
                          value={businessInfo.sms_ir_check_due_3_template_id || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="sms_ir_check_due_today_template_id" className={labelClass}>شناسه قالب چک - همان روز</label>
                        <input
                          type="text"
                          id="sms_ir_check_due_today_template_id"
                          name="sms_ir_check_due_today_template_id"
                          value={businessInfo.sms_ir_check_due_today_template_id || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="sms_ir_installment_template_id" className={labelClass}>شناسه قالب یادآوری قسط</label>
                        <input
                          type="text"
                          id="sms_ir_installment_template_id"
                          name="sms_ir_installment_template_id"
                          value={businessInfo.sms_ir_installment_template_id || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="sms_ir_installment_completed_template_id" className={labelClass}>شناسه قالب تسویه کامل اقساط (پرداخت نهایی)</label>
                        <input
                          type="text"
                          id="sms_ir_installment_completed_template_id"
                          name="sms_ir_installment_completed_template_id"
                          value={businessInfo.sms_ir_installment_completed_template_id || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="sms_ir_repair_received_template_id" className={labelClass}>شناسه قالب تحویل تعمیر</label>
                        <input
                          type="text"
                          id="sms_ir_repair_received_template_id"
                          name="sms_ir_repair_received_template_id"
                          value={businessInfo.sms_ir_repair_received_template_id || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="sms_ir_repair_cost_estimated_template_id" className={labelClass}>شناسه قالب برآورد هزینه تعمیر</label>
                        <input
                          type="text"
                          id="sms_ir_repair_cost_estimated_template_id"
                          name="sms_ir_repair_cost_estimated_template_id"
                          value={businessInfo.sms_ir_repair_cost_estimated_template_id || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="sms_ir_repair_ready_template_id" className={labelClass}>شناسه قالب آماده تحویل تعمیر</label>
                        <input
                          type="text"
                          id="sms_ir_repair_ready_template_id"
                          name="sms_ir_repair_ready_template_id"
                          value={businessInfo.sms_ir_repair_ready_template_id || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </>
                )}
                {/* Fields for IPPANEL */}
                {businessInfo.sms_provider === 'ippanel' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="ippanel_token" className={labelClass}>توکن IPPanel</label>
                        <input
                          type="text"
                          id="ippanel_token"
                          name="ippanel_token"
                          value={businessInfo.ippanel_token || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="ippanel_from_number" className={labelClass}>شماره فرستنده IPPanel</label>
                        <input
                          type="text"
                          id="ippanel_from_number"
                          name="ippanel_from_number"
                          value={businessInfo.ippanel_from_number || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                    {/* IPPanel patterns for installment due reminders */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="ippanel_installment_due_7_pattern_code" className={labelClass}>کد الگوی قسط - ۷ روز قبل</label>
                        <input
                          type="text"
                          id="ippanel_installment_due_7_pattern_code"
                          name="ippanel_installment_due_7_pattern_code"
                          value={businessInfo.ippanel_installment_due_7_pattern_code || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="ippanel_installment_due_3_pattern_code" className={labelClass}>کد الگوی قسط - ۳ روز قبل</label>
                        <input
                          type="text"
                          id="ippanel_installment_due_3_pattern_code"
                          name="ippanel_installment_due_3_pattern_code"
                          value={businessInfo.ippanel_installment_due_3_pattern_code || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="ippanel_installment_due_today_pattern_code" className={labelClass}>کد الگوی قسط - همان روز</label>
                        <input
                          type="text"
                          id="ippanel_installment_due_today_pattern_code"
                          name="ippanel_installment_due_today_pattern_code"
                          value={businessInfo.ippanel_installment_due_today_pattern_code || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                    {/* IPPanel patterns for check due reminders */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="ippanel_check_due_7_pattern_code" className={labelClass}>کد الگوی چک - ۷ روز قبل</label>
                        <input
                          type="text"
                          id="ippanel_check_due_7_pattern_code"
                          name="ippanel_check_due_7_pattern_code"
                          value={businessInfo.ippanel_check_due_7_pattern_code || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="ippanel_check_due_3_pattern_code" className={labelClass}>کد الگوی چک - ۳ روز قبل</label>
                        <input
                          type="text"
                          id="ippanel_check_due_3_pattern_code"
                          name="ippanel_check_due_3_pattern_code"
                          value={businessInfo.ippanel_check_due_3_pattern_code || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="ippanel_check_due_today_pattern_code" className={labelClass}>کد الگوی چک - همان روز</label>
                        <input
                          type="text"
                          id="ippanel_check_due_today_pattern_code"
                          name="ippanel_check_due_today_pattern_code"
                          value={businessInfo.ippanel_check_due_today_pattern_code || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="ippanel_installment_pattern_code" className={labelClass}>کد الگوی یادآوری قسط</label>
                        <input
                          type="text"
                          id="ippanel_installment_pattern_code"
                          name="ippanel_installment_pattern_code"
                          value={businessInfo.ippanel_installment_pattern_code || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="ippanel_installment_completed_pattern_code" className={labelClass}>کد الگوی تسویه کامل اقساط (پرداخت نهایی)</label>
                        <input
                          type="text"
                          id="ippanel_installment_completed_pattern_code"
                          name="ippanel_installment_completed_pattern_code"
                          value={businessInfo.ippanel_installment_completed_pattern_code || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="ippanel_repair_received_pattern_code" className={labelClass}>کد الگوی تحویل تعمیر</label>
                        <input
                          type="text"
                          id="ippanel_repair_received_pattern_code"
                          name="ippanel_repair_received_pattern_code"
                          value={businessInfo.ippanel_repair_received_pattern_code || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="ippanel_repair_cost_estimated_pattern_code" className={labelClass}>کد الگوی برآورد هزینه تعمیر</label>
                        <input
                          type="text"
                          id="ippanel_repair_cost_estimated_pattern_code"
                          name="ippanel_repair_cost_estimated_pattern_code"
                          value={businessInfo.ippanel_repair_cost_estimated_pattern_code || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="ippanel_repair_ready_pattern_code" className={labelClass}>کد الگوی آماده تحویل تعمیر</label>
                        <input
                          type="text"
                          id="ippanel_repair_ready_pattern_code"
                          name="ippanel_repair_ready_pattern_code"
                          value={businessInfo.ippanel_repair_ready_pattern_code || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* بخش تلگرام داخل تب پیامک حذف شده و در تب مستقل نمایش داده می‌شود */}

              </fieldset>

			  {/* SMS logs + retry */}
			  <SmsLogsPanel />

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => handleBusinessInfoSubmit()}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:brightness-110"
                >
                  ذخیره تنظیمات پیامک
                </button>
              </div>
            </div>
          )}

          {/* تب تنظیمات تلگرام */}
          {tab === 'telegram' && (
            <form id="telegram-settings-form" onSubmit={handleBusinessInfoSubmit} className="space-y-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-200 border border-sky-200/60 dark:border-sky-900/30">
                      <i className="fa-brands fa-telegram" />
                    </span>
                    تلگرام
                  </div>
                  <div className="app-subtle mt-1">ارسال رویدادی و تست اتصال ربات. (متن آزاد فقط برای تلگرام مجاز است.)</div>
                </div>
                <button type="submit" disabled={isSaving} className="px-4 py-2 rounded-xl bg-primary text-white hover:brightness-110 disabled:opacity-60">
                  <i className="fa-solid fa-floppy-disk ml-2" />
                  {isSaving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
                </button>
              </div>

              {/* اتصال ربات */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/40 p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">اتصال ربات</div>
                    <div className="app-subtle">توکن را از BotFather بگیرید و chat_id را از گیرنده/کانال مقصد.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={checkTelegramHealth} disabled={tgIsChecking} className="px-3 py-2 rounded-xl bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 disabled:opacity-60">
                      <i className={`fa-solid ${tgIsChecking ? 'fa-rotate fa-spin' : 'fa-heart-pulse'} ml-1`} />
                      بررسی اتصال
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="telegram_bot_token" className={labelClass}>توکن ربات تلگرام</label>
                    <input type={showTelegramToken ? 'text' : 'password'} id="telegram_bot_token" name="telegram_bot_token" value={businessInfo.telegram_bot_token || ''} onChange={handleBusinessInfoChange} className={inputClass} dir="ltr" placeholder="123456:ABC-DEF..." />
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                      <button type="button" className="rounded-lg border px-2 py-1 hover:bg-gray-50" onClick={() => setShowTelegramToken((s) => !s)}>
                        {showTelegramToken ? 'پنهان کن' : 'نمایش توکن'}
                      </button>
                      <span>برای امنیت، توکن به صورت پیش‌فرض مخفی است.</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="telegram_chat_id" className={labelClass}>شناسه چت (chat_id)</label>
                    <input type="text" id="telegram_chat_id" name="telegram_chat_id" value={businessInfo.telegram_chat_id || ''} onChange={handleBusinessInfoChange} className={inputClass} dir="ltr" placeholder="-1001234567890 یا 12345678" />
                  </div>

                  <div>
                    <label htmlFor="telegram_proxy" className={labelClass}>پراکسی تلگرام (اختیاری)</label>
                    <input
                      type="text"
                      id="telegram_proxy"
                      name="telegram_proxy"
                      value={(businessInfo as any).telegram_proxy || ''}
                      onChange={handleBusinessInfoChange}
                      className={inputClass}
                      dir="ltr"
                      placeholder="socks5://127.0.0.1:10808 یا http://127.0.0.1:10809"
                    />
                    <div className="mt-1 text-xs text-gray-500">
                      اگر سرور/سیستم شما داخل ایران است و تلگرام فیلتر است، اینجا پراکسی خروجی را بزنید (مثلاً v2rayN: <span dir="ltr">socks5://127.0.0.1:10808</span>).
                    </div>
                  </div>

                  <div>
                    <label htmlFor="app_base_url" className={labelClass}>آدرس عمومی برنامه (برای لینک داخل پیام)</label>
                    <input type="text" id="app_base_url" name="app_base_url" value={businessInfo.app_base_url || ''} onChange={handleBusinessInfoChange} className={inputClass} dir="ltr" placeholder="مثلاً https://192.168.1.106:5173" />
                    <div className="mt-1 text-xs text-gray-500">اگر خالی باشد، لینک داخل پیام‌ها ساخته نمی‌شود.</div>
                  </div>

                  <div>
                    <label htmlFor="telegram_silent_hours" className={labelClass}>ساعات سکوت تلگرام</label>
                    <input type="text" id="telegram_silent_hours" name="telegram_silent_hours" value={businessInfo.telegram_silent_hours || ''} onChange={handleBusinessInfoChange} className={inputClass} dir="ltr" placeholder="مثلاً 22:00-08:00" />
                    <div className="mt-1 text-xs text-gray-500">در این بازه، پیام‌های تلگرام تا پایان بازه به تعویق می‌افتند.</div>
                  </div>
                </div>

                {/* تفکیک مقصد تلگرام برای بخش‌ها */}
                <div className="mt-4">
                  <div className="text-sm text-gray-500 mb-2">می‌توانید برای هر بخش چند chat_id وارد کنید (با ویرگول یا خط جدید جدا کنید). اگر خالی باشد از «شناسه چت» اصلی استفاده می‌شود.</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="telegram_chat_ids_reports" className={labelClass}>گزارشات</label>
                      <textarea id="telegram_chat_ids_reports" name="telegram_chat_ids_reports" value={businessInfo.telegram_chat_ids_reports || ''} onChange={handleBusinessInfoChange} className={inputClass} dir="ltr" rows={3} placeholder={"-1001234567890\n672412513"} />
                    </div>
                    <div>
                      <label htmlFor="telegram_chat_ids_installments" className={labelClass}>اقساط</label>
                      <textarea id="telegram_chat_ids_installments" name="telegram_chat_ids_installments" value={businessInfo.telegram_chat_ids_installments || ''} onChange={handleBusinessInfoChange} className={inputClass} dir="ltr" rows={3} placeholder={"-1001234567890\n672412513"} />
                    </div>
                    <div>
                      <label htmlFor="telegram_chat_ids_sales" className={labelClass}>فروش</label>
                      <textarea id="telegram_chat_ids_sales" name="telegram_chat_ids_sales" value={businessInfo.telegram_chat_ids_sales || ''} onChange={handleBusinessInfoChange} className={inputClass} dir="ltr" rows={3} placeholder={"-1001234567890\n672412513"} />
                    </div>
                    <div>
                      <label htmlFor="telegram_chat_ids_notifications" className={labelClass}>سایر نوتیفیکیشن‌ها</label>
                      <textarea id="telegram_chat_ids_notifications" name="telegram_chat_ids_notifications" value={businessInfo.telegram_chat_ids_notifications || ''} onChange={handleBusinessInfoChange} className={inputClass} dir="ltr" rows={3} placeholder={"-1001234567890\n672412513"} />
                    </div>
                  </div>
                </div>

                {/* تست سریع */}
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
                  <div className="lg:col-span-2">
                    <label className={labelClass}>ارسال تست سریع</label>
                    <input className={inputClass} dir="rtl" value={tgQuickMsg} onChange={(e) => setTgQuickMsg(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={sendTelegramQuickTest} disabled={tgIsSendingQuick} className="w-full px-3 py-2 rounded-xl bg-primary text-white hover:brightness-110 disabled:opacity-60">
                      <i className={`fa-solid ${tgIsSendingQuick ? 'fa-paper-plane fa-bounce' : 'fa-paper-plane'} ml-1`} />
                      {tgIsSendingQuick ? 'در حال ارسال…' : 'ارسال تست'}
                    </button>
                  </div>
                </div>

                {tgHealth ? (
                  <div className={`mt-4 rounded-xl border p-3 text-sm ${tgHealth.ok ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-900/30' : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-900/20 dark:text-rose-200 dark:border-emerald-900/30'}`}>
                    <div className="font-semibold">{tgHealth.msg}</div>
                    {tgHealth.ok && tgHealth.bot ? (
                      <div className="mt-1 text-xs" dir="ltr">@{tgHealth.bot?.username} — {tgHealth.bot?.first_name}</div>
                    ) : null}
                  </div>
                ) : null}
              </div>

{/* پیام‌های اقساط */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/40 p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">پیام‌های اقساط</div>
                    <div className="app-subtle">Placeholders مثل {`{name}`} / {`{amount}`} / {`{dueDate}`} قابل جایگزینی هستند.</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="telegram_installment_reminder_message" className={labelClass}>یادآوری قسط (کلی)</label>
                      <button type="button" onClick={() => openTelegramTemplateTest('تست: یادآوری قسط (کلی)', String(businessInfo.telegram_installment_reminder_message || ''))} className="text-xs px-2 py-1 rounded-lg bg-slate-900 text-white">تست</button>
                    </div>
                    <textarea id="telegram_installment_reminder_message" name="telegram_installment_reminder_message" value={businessInfo.telegram_installment_reminder_message || ''} onChange={handleBusinessInfoChange} className={`${inputClass} h-28`} dir="rtl" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="telegram_installment_completed_message" className={labelClass}>تسویه کامل اقساط (پرداخت نهایی)</label>
                      <button type="button" onClick={() => openTelegramTemplateTest('تست: تسویه اقساط', String(businessInfo.telegram_installment_completed_message || ''))} className="text-xs px-2 py-1 rounded-lg bg-slate-900 text-white">تست</button>
                    </div>
                    <textarea id="telegram_installment_completed_message" name="telegram_installment_completed_message" value={businessInfo.telegram_installment_completed_message || ''} onChange={handleBusinessInfoChange} className={`${inputClass} h-28`} dir="rtl" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="telegram_installment_due_7_message" className={labelClass}>قسط – ۷ روز قبل</label>
                      <button type="button" onClick={() => openTelegramTemplateTest('تست: قسط ۷ روز قبل', String(businessInfo.telegram_installment_due_7_message || ''))} className="text-xs px-2 py-1 rounded-lg bg-slate-900 text-white">تست</button>
                    </div>
                    <textarea id="telegram_installment_due_7_message" name="telegram_installment_due_7_message" value={businessInfo.telegram_installment_due_7_message || ''} onChange={handleBusinessInfoChange} className={`${inputClass} h-28`} dir="rtl" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="telegram_installment_due_3_message" className={labelClass}>قسط – ۳ روز قبل</label>
                      <button type="button" onClick={() => openTelegramTemplateTest('تست: قسط ۳ روز قبل', String(businessInfo.telegram_installment_due_3_message || ''))} className="text-xs px-2 py-1 rounded-lg bg-slate-900 text-white">تست</button>
                    </div>
                    <textarea id="telegram_installment_due_3_message" name="telegram_installment_due_3_message" value={businessInfo.telegram_installment_due_3_message || ''} onChange={handleBusinessInfoChange} className={`${inputClass} h-28`} dir="rtl" />
                  </div>

                  <div className="space-y-2 lg:col-span-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="telegram_installment_due_today_message" className={labelClass}>قسط – همان روز</label>
                      <button type="button" onClick={() => openTelegramTemplateTest('تست: قسط امروز', String(businessInfo.telegram_installment_due_today_message || ''))} className="text-xs px-2 py-1 rounded-lg bg-slate-900 text-white">تست</button>
                    </div>
                    <textarea id="telegram_installment_due_today_message" name="telegram_installment_due_today_message" value={businessInfo.telegram_installment_due_today_message || ''} onChange={handleBusinessInfoChange} className={`${inputClass} h-28`} dir="rtl" />
                  </div>
                </div>
              </div>

              {/* پیام‌های چک */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/40 p-5">
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">پیام‌های چک</div>
                  <div className="app-subtle">Placeholders: {`{name}`} / {`{checkNumber}`} / {`{dueDate}`} / {`{amount}`}</div>
                </div>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="telegram_check_due_7_message" className={labelClass}>چک – ۷ روز قبل</label>
                      <button type="button" onClick={() => openTelegramTemplateTest('تست: چک ۷ روز قبل', String(businessInfo.telegram_check_due_7_message || ''))} className="text-xs px-2 py-1 rounded-lg bg-slate-900 text-white">تست</button>
                    </div>
                    <textarea id="telegram_check_due_7_message" name="telegram_check_due_7_message" value={businessInfo.telegram_check_due_7_message || ''} onChange={handleBusinessInfoChange} className={`${inputClass} h-28`} dir="rtl" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="telegram_check_due_3_message" className={labelClass}>چک – ۳ روز قبل</label>
                      <button type="button" onClick={() => openTelegramTemplateTest('تست: چک ۳ روز قبل', String(businessInfo.telegram_check_due_3_message || ''))} className="text-xs px-2 py-1 rounded-lg bg-slate-900 text-white">تست</button>
                    </div>
                    <textarea id="telegram_check_due_3_message" name="telegram_check_due_3_message" value={businessInfo.telegram_check_due_3_message || ''} onChange={handleBusinessInfoChange} className={`${inputClass} h-28`} dir="rtl" />
                  </div>

                  <div className="space-y-2 lg:col-span-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="telegram_check_due_today_message" className={labelClass}>چک – همان روز</label>
                      <button type="button" onClick={() => openTelegramTemplateTest('تست: چک امروز', String(businessInfo.telegram_check_due_today_message || ''))} className="text-xs px-2 py-1 rounded-lg bg-slate-900 text-white">تست</button>
                    </div>
                    <textarea id="telegram_check_due_today_message" name="telegram_check_due_today_message" value={businessInfo.telegram_check_due_today_message || ''} onChange={handleBusinessInfoChange} className={`${inputClass} h-28`} dir="rtl" />
                  </div>
                </div>
              </div>

              {/* پیام‌های تعمیرات */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/40 p-5">
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">پیام‌های تعمیرات</div>
                  <div className="app-subtle">Placeholders: {`{name}`} / {`{deviceModel}`} / {`{repairId}`} / {`{estimatedCost}`} / {`{finalCost}`}</div>
                </div>
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="telegram_repair_received_message" className={labelClass}>پذیرش تعمیر</label>
                      <button type="button" onClick={() => openTelegramTemplateTest('تست: پذیرش تعمیر', String(businessInfo.telegram_repair_received_message || ''))} className="text-xs px-2 py-1 rounded-lg bg-slate-900 text-white">تست</button>
                    </div>
                    <textarea id="telegram_repair_received_message" name="telegram_repair_received_message" value={businessInfo.telegram_repair_received_message || ''} onChange={handleBusinessInfoChange} className={`${inputClass} h-28`} dir="rtl" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="telegram_repair_cost_estimated_message" className={labelClass}>برآورد هزینه تعمیر</label>
                      <button type="button" onClick={() => openTelegramTemplateTest('تست: برآورد هزینه', String(businessInfo.telegram_repair_cost_estimated_message || ''))} className="text-xs px-2 py-1 rounded-lg bg-slate-900 text-white">تست</button>
                    </div>
                    <textarea id="telegram_repair_cost_estimated_message" name="telegram_repair_cost_estimated_message" value={businessInfo.telegram_repair_cost_estimated_message || ''} onChange={handleBusinessInfoChange} className={`${inputClass} h-28`} dir="rtl" />
                  </div>
                  <div className="space-y-2 lg:col-span-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="telegram_repair_ready_message" className={labelClass}>آماده تحویل تعمیر</label>
                      <button type="button" onClick={() => openTelegramTemplateTest('تست: آماده تحویل', String(businessInfo.telegram_repair_ready_message || ''))} className="text-xs px-2 py-1 rounded-lg bg-slate-900 text-white">تست</button>
                    </div>
                    <textarea id="telegram_repair_ready_message" name="telegram_repair_ready_message" value={businessInfo.telegram_repair_ready_message || ''} onChange={handleBusinessInfoChange} className={`${inputClass} h-28`} dir="rtl" />
                  </div>
                </div>
              </div>

              <TelegramLogsPanel />
            </form>
          )}

          {tab === 'style' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* ستون اصلی کنترل‌ها */}
              <div className="lg:col-span-2 space-y-6">
                {/* Theme */}
                <div className="rounded-2xl border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-base font-semibold text-gray-900 dark:text-gray-100">Theme</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">تغییرات فوراً اعمال می‌شوند و ذخیره می‌گردند.</div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">Live</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={[
                        'px-4 py-2 rounded-xl border text-sm font-semibold',
                        style.theme === 'light'
                          ? 'bg-white border-primary/40 shadow-sm'
                          : 'bg-white/60 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600',
                      ].join(' ')}
                    >
                      <i className="fa-regular fa-sun ml-2" /> روشن
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={[
                        'px-4 py-2 rounded-xl border text-sm font-semibold',
                        style.theme === 'dark'
                          ? 'bg-gray-900 text-white border-gray-800 shadow-sm'
                          : 'bg-white/60 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600',
                      ].join(' ')}
                    >
                      <i className="fa-regular fa-moon ml-2" /> تیره
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('system')}
                      className={[
                        'px-4 py-2 rounded-xl border text-sm font-semibold',
                        style.theme === 'system'
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white/60 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600',
                      ].join(' ')}
                    >
                      <i className="fa-solid fa-laptop ml-2" /> سیستمی
                    </button>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="px-4 py-2 rounded-xl border text-sm font-semibold bg-white/60 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                      title="چرخش بین حالت‌ها"
                    >
                      <i className="fa-solid fa-rotate ml-2" /> چرخش
                    </button>
                  </div>
                </div>

                {/* Brand */}
                <div className="rounded-2xl border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-gray-900 dark:text-gray-100">تم و استایل برند</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                        پالت آماده انتخاب کن یا دقیقاً Hue / Saturation / Lightness رو تنظیم کن.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={resetStyle}
                      className="text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
                      title="بازنشانی استایل"
                    >
                      <i className="fa-solid fa-rotate-left ml-2" /> ریست
                    </button>
                  </div>

                  {/* Presets */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStyle('palette', 'aurora');
                        setStyle('primaryHue', 258);
                        setStyle('primaryS', 90);
                        setStyle('primaryL', 50);
                      }}
                      className={[
                        'rounded-2xl border p-4 text-right transition-all hover:shadow-md',
                        style.palette === 'aurora' ? 'border-primary/50 ring-2 ring-primary/20' : 'border-gray-200 dark:border-gray-700',
                        'bg-white dark:bg-gray-900/30',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-3">
                        <span className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700" />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">Aurora</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">پیش‌فرض پیشنهادی</div>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStyle('palette', 'ocean');
                        setStyle('primaryHue', 199);
                        setStyle('primaryS', 90);
                        setStyle('primaryL', 48);
                      }}
                      className={[
                        'rounded-2xl border p-4 text-right transition-all hover:shadow-md',
                        style.palette === 'ocean' ? 'border-primary/50 ring-2 ring-primary/20' : 'border-gray-200 dark:border-gray-700',
                        'bg-white dark:bg-gray-900/30',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-3">
                        <span className="h-10 w-10 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500" />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">Ocean</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">حس تکنولوژی/آبی</div>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStyle('palette', 'sunset');
                        setStyle('primaryHue', 330);
                        setStyle('primaryS', 92);
                        setStyle('primaryL', 52);
                      }}
                      className={[
                        'rounded-2xl border p-4 text-right transition-all hover:shadow-md',
                        style.palette === 'sunset' ? 'border-primary/50 ring-2 ring-primary/20' : 'border-gray-200 dark:border-gray-700',
                        'bg-white dark:bg-gray-900/30',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-3">
                        <span className="h-10 w-10 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-400" />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">Sunset</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">گرم و پرانرژی</div>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Precise Controls */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className={labelClass}>Hue</label>
                      <input type="range" min={0} max={360} value={style.primaryHue} onChange={(e) => setStyle('primaryHue', Number(e.target.value))} className="w-full" />
                      <div className="text-xs text-gray-500 mt-1">{style.primaryHue}</div>
                    </div>
                    <div>
                      <label className={labelClass}>Saturation</label>
                      <input type="range" min={40} max={100} value={style.primaryS} onChange={(e) => setStyle('primaryS', Number(e.target.value))} className="w-full" />
                      <div className="text-xs text-gray-500 mt-1">{style.primaryS}%</div>
                    </div>
                    <div>
                      <label className={labelClass}>Lightness</label>
                      <input type="range" min={30} max={70} value={style.primaryL} onChange={(e) => setStyle('primaryL', Number(e.target.value))} className="w-full" />
                      <div className="text-xs text-gray-500 mt-1">{style.primaryL}%</div>
                    </div>
                  </div>

                  {/* Scale Preview */}
                  <div className="mt-6">
                    <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">پیش‌نمایش طیف رنگی (primary-50 تا primary-900)</div>
                    <div className="grid grid-cols-9 gap-1">
                      <div className="h-8 rounded-lg bg-primary-50 border border-gray-200 dark:border-gray-700" />
                      <div className="h-8 rounded-lg bg-primary-100" />
                      <div className="h-8 rounded-lg bg-primary-200" />
                      <div className="h-8 rounded-lg bg-primary-300" />
                      <div className="h-8 rounded-lg bg-primary-400" />
                      <div className="h-8 rounded-lg bg-primary-500" />
                      <div className="h-8 rounded-lg bg-primary-600" />
                      <div className="h-8 rounded-lg bg-primary-700" />
                      <div className="h-8 rounded-lg bg-primary-800" />
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="rounded-2xl border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                  <div className="text-base font-semibold text-gray-900 dark:text-gray-100">سایدبار</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">نمایش، سایز آیکن و حالت Pill/Classic</div>

                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClass}>حالت</label>
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                          <input type="radio" name="sidebarVariant" value="classic" checked={style.sidebarVariant === 'classic'} onChange={() => setStyle('sidebarVariant', 'classic')} />
                          Classic
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                          <input type="radio" name="sidebarVariant" value="pill" checked={style.sidebarVariant === 'pill'} onChange={() => setStyle('sidebarVariant', 'pill')} />
                          Pill
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>اندازه آیکن</label>
                      <input type="range" min={28} max={56} value={style.sidebarIconPx} onChange={(e) => setStyle('sidebarIconPx', Number(e.target.value))} className="w-full" />
                      <div className="text-xs text-gray-500 mt-1">{style.sidebarIconPx}px</div>
                    </div>
                    <div className={[style.sidebarVariant === 'pill' ? '' : 'opacity-50'].join(' ')}>
                      <label className={labelClass}>عرض Pill</label>
                      <input type="range" min={180} max={320} value={style.sidebarPillWidthPx} onChange={(e) => setStyle('sidebarPillWidthPx', Number(e.target.value))} className="w-full" disabled={style.sidebarVariant !== 'pill'} />
                      <div className="text-xs text-gray-500 mt-1">{style.sidebarPillWidthPx}px</div>
                    </div>
                    <div>
                      <label className={labelClass}>Ink Bar</label>
                      <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={style.showInkBar} onChange={(e) => setStyle('showInkBar', e.target.checked)} />
                        نمایش نوار گرادیانی
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* ستون راست: Preview + Pro tools */}
              <div className="space-y-6">
                <div className="rounded-2xl border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">پیش‌نمایش زنده</div>
                    <span className="text-[11px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300">{style.palette}</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/60 dark:bg-gray-900/30">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">نمونه کارت</div>
<div className="mt-3 flex items-center gap-2">
                        <button className="px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold">
                          <i className="fa-solid fa-paper-plane ml-2" /> اکشن اصلی
                        </button>
                        <button className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 text-xs font-semibold">
                          اکشن ثانویه
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl p-4 bg-gradient-to-br from-primary-500/15 to-primary-700/10 border border-primary/15">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Badge / Pills</div>
                        <span className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary">Premium</span>
                      </div>
</div>
                  </div>
                </div>

                <div className="rounded-2xl border bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 p-4 text-xs text-blue-700 dark:text-blue-200">
                  <div className="font-semibold mb-1"><i className="fa-solid fa-circle-info ml-1" /> نکته</div>
                  رنگ‌ها از این به بعد «دقیق» هستند چون کل مقیاس primary بر اساس Hue/Sat/Light محاسبه می‌شود.
                </div>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center mb-2 pb-2 border-b dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">مدیریت کاربران</h3>
                <button onClick={openAddUserModal} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:brightness-110">
                  <i className="fas fa-plus ml-2" />
                  افزودن کاربر
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-gray-600 dark:text-gray-400">
                    <tr>
                      <th className="py-2 text-right">نام کاربری</th>
                      <th className="py-2 text-right">نقش</th>
                      <th className="py-2 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {users.map(user => (
                      <tr key={user.id}>
                        <td className="py-3">{user.username}</td>
                        <td className="py-3">{user.roleName}</td>
                        <td className="py-3 text-center space-x-1 space-x-reverse">
                          <button onClick={() => openEditUserModal(user)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-full" title="ویرایش نقش">
                            <i className="fas fa-edit" />
                          </button>
                          <button onClick={() => openResetPasswordModal(user)} className="p-2 text-yellow-500 hover:bg-yellow-100 rounded-full" title="بازنشانی رمز عبور">
                            <i className="fas fa-key" />
                          </button>
                          {user.username !== 'admin' && (
                            <button onClick={() => openDeleteUserModal(user)} className="p-2 text-red-500 hover:bg-red-100 rounded-full" title="حذف کاربر">
                              <i className="fas fa-trash" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'data' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-t-4 border-red-500">
                <h3 className="text-lg font-semibold text-red-500 flex items-center mb-4">
                  <i className="fas fa-database ml-2" />
                  مدیریت داده‌ها
                </h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">پشتیبان‌گیری</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3">
                      از کل پایگاه داده یک فایل پشتیبان تهیه کنید تا در مواقع ضروری از آن استفاده کنید.
                    </p>
                    <button onClick={handleBackup} className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:brightness-110">
                      <i className="fas fa-download ml-2" />
                      دانلود فایل پشتیبان
                    </button>
                  </div>
                  
                    <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white/60 dark:bg-gray-900/30">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">بکاپ‌های زمان‌بندی‌شده</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            زمان‌بندی روی سرور اجرا می‌شود. اگر سرور را ریستارت کنید، تنظیمات از همینجا خوانده می‌شود.
                          </div>
                        </div>
                        <button
                          onClick={handleSaveBackupSchedule}
                          className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:opacity-95"
                        >
                          ذخیره تنظیمات
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={backupEnabled}
                            onChange={(e) => setBackupEnabled(e.target.checked)}
                          />
                          فعال
                        </label>

                        <div>
                          <div className="text-xs text-gray-500 mb-1">Cron</div>
                          <input
                            value={backupCron}
                            onChange={(e) => setBackupCron(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-md border dark:border-gray-700 bg-white dark:bg-gray-900"
                            placeholder="0 2 * * *"
                          />
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 mb-1">Timezone</div>
                          <input
                            value={backupTimezone}
                            onChange={(e) => setBackupTimezone(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-md border dark:border-gray-700 bg-white dark:bg-gray-900"
                            placeholder="Asia/Tehran"
                          />
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 mb-1">Retention</div>
                          <input
                            type="number"
                            min={1}
                            value={backupRetention}
                            onChange={(e) => setBackupRetention(Number(e.target.value))}
                            className="w-full px-3 py-2 text-sm rounded-md border dark:border-gray-700 bg-white dark:bg-gray-900"
                            placeholder="14"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-gray-800 dark:text-gray-200">لیست بکاپ‌ها</div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleCreateBackupNow}
                            className="px-3 py-2 text-xs bg-primary text-white rounded-md hover:brightness-110"
                          >
                            ایجاد بکاپ
                          </button>
                          <button
                            onClick={fetchBackups}
                            className="px-3 py-2 text-xs border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            بروزرسانی
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 overflow-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="text-right py-2">فایل</th>
                              <th className="text-right py-2">تاریخ</th>
                              <th className="text-right py-2">سایز</th>
                              <th className="text-right py-2">عملیات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {isLoadingBackups ? (
                              <tr><td colSpan={4} className="py-3 text-center text-gray-500">در حال بارگذاری...</td></tr>
                            ) : backupList.length === 0 ? (
                              <tr><td colSpan={4} className="py-3 text-center text-gray-500">بکاپی موجود نیست.</td></tr>
                            ) : (
                              backupList.map((b) => (
                                <tr key={b.fileName} className="border-t dark:border-gray-700">
                                  <td className="py-2">{b.fileName}</td>
                                  <td className="py-2">{new Date(b.mtime).toLocaleString('fa-IR')}</td>
                                  <td className="py-2">{Math.round((b.size/1024/1024)*100)/100} MB</td>
                                  <td className="py-2">
                                    <div className="flex flex-wrap gap-2">
                                      <button onClick={() => handleDownloadBackupFile(b.fileName)} className="px-2 py-1 rounded border hover:bg-gray-50 dark:hover:bg-gray-800">دانلود</button>
                                      <button onClick={() => handleTestRestore(b.fileName)} className="px-2 py-1 rounded border hover:bg-gray-50 dark:hover:bg-gray-800">تست</button>
                                      <button onClick={() => handleRestoreFromBackup(b.fileName)} className="px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">Restore</button>
                                      <button onClick={() => handleDeleteBackupFile(b.fileName)} className="px-2 py-1 rounded border hover:bg-gray-50 dark:hover:bg-gray-800">حذف</button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  <hr className="dark:border-gray-700" />
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">بازیابی اطلاعات</h4>
                    <div className="text-xs p-2 my-2 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-300 border-r-2 border-red-500">
                      <b>هشدار:</b> این عمل تمام اطلاعات فعلی شما را با اطلاعات فایل پشتیبان جایگزین می‌کند و غیرقابل بازگشت است.
                    </div>
                    <input type="file" ref={dbFileInputRef} onChange={handleDbFileChange} accept=".db" className="hidden" />
                    <button onClick={() => dbFileInputRef.current?.click()} disabled={isRestoringDb} className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400">
                      {isRestoringDb ? (<><i className="fas fa-spinner fa-spin ml-2" />در حال بازیابی...</>) : (<><i className="fas fa-upload ml-2" />بازیابی از فایل</>)}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Save Footer for server settings */}
        {(tab === 'business' || tab === 'sms') && (
          <div className="sticky bottom-0 right-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-4 border-t dark:border-gray-700 z-40 print:hidden">
            <div className="max-w-7xl mx-auto flex justify-end">
              <button
                type="submit"
                form={tab === 'business' ? 'settings-form' : undefined}
                onClick={tab === 'sms' ? () => handleBusinessInfoSubmit() : undefined}
                disabled={tab === 'business' ? !infoChanged || isSaving : isSaving}
                className="px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 disabled:opacity-60 transition-colors shadow-lg"
              >
                {isSaving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
              </button>
            </div>
          </div>
        )}
	        </section>
      </div>

      {/* Restore Modal */}
      {isRestoreModalOpen && (
        <Modal title="تایید بازیابی اطلاعات" onClose={() => setIsRestoreModalOpen(false)}>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            آیا از بازیابی اطلاعات از فایل <b>{dbFile?.name}</b> مطمئن هستید؟ این عمل غیرقابل بازگشت است.
          </p>
          <div className="flex justify-end pt-3 gap-3">
            <button onClick={() => setIsRestoreModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200">
              انصراف
            </button>
            <button onClick={handleRestore} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              تایید و بازیابی
            </button>
          </div>
        </Modal>
      )}

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <Modal title="افزودن کاربر جدید" onClose={() => setIsAddUserModalOpen(false)}>
          <form onSubmit={handleNewUserSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>نام کاربری</label>
              <input type="text" name="username" value={newUser.username} onChange={handleNewUserChange} className={inputClass} />
              {addUserFormErrors.username && <p className="text-xs text-red-500 mt-1">{addUserFormErrors.username}</p>}
            </div>
            <div>
              <label className={labelClass}>کلمه عبور</label>
              <input type="password" name="password" value={newUser.password} onChange={handleNewUserChange} className={inputClass} />
              {addUserFormErrors.password && <p className="text-xs text-red-500 mt-1">{addUserFormErrors.password}</p>}
            </div>
            <div>
              <label className={labelClass}>تکرار کلمه عبور</label>
              <input type="password" name="confirmPassword" value={newUser.confirmPassword} onChange={handleNewUserChange} className={inputClass} />
              {addUserFormErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{addUserFormErrors.confirmPassword}</p>}
            </div>
            <div>
              <label className={labelClass}>نقش</label>
              <select name="roleId" value={newUser.roleId} onChange={handleNewUserChange} className={inputClass}>
                <option value="" disabled>-- انتخاب نقش --</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end pt-2 gap-3">
              <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded-md">انصراف</button>
              <button type="submit" disabled={isSavingUser} className="px-4 py-2 bg-primary text-white rounded-md">{isSavingUser ? 'در حال ذخیره...' : 'افزودن'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit User Modal */}
      {isEditUserModalOpen && editingUser && (
        <Modal title={`ویرایش کاربر: ${editingUser.username}`} onClose={() => setIsEditUserModalOpen(false)}>
          <form onSubmit={handleEditUserSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>نام کاربری</label>
              <input type="text" value={editingUser.username} disabled className={`${inputClass} bg-gray-100 dark:bg-gray-800`} />
            </div>
            <div>
              <label className={labelClass}>نقش</label>
              <select name="roleId" value={editingUser.roleId} onChange={handleEditUserChange} className={inputClass}>
                <option value="" disabled>-- انتخاب نقش --</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end pt-2 gap-3">
              <button type="button" onClick={() => setIsEditUserModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded-md">انصراف</button>
              <button type="submit" disabled={isUpdatingUser} className="px-4 py-2 bg-primary text-white rounded-md">{isUpdatingUser ? 'در حال ذخیره...' : 'ذخیره'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset Password */}
      {isResetPasswordModalOpen && resettingUser && (
        <Modal title={`بازنشانی رمز عبور برای: ${resettingUser.username}`} onClose={() => setIsResetPasswordModalOpen(false)}>
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>کلمه عبور جدید</label>
              <input type="password" value={resetPasswordData.password} onChange={(e) => setResetPasswordData(p => ({ ...p, password: e.target.value }))} className={inputClass} />
              {resetPasswordErrors.password && <p className="text-xs text-red-500 mt-1">{resetPasswordErrors.password}</p>}
            </div>
            <div>
              <label className={labelClass}>تکرار کلمه عبور</label>
              <input type="password" value={resetPasswordData.confirmPassword} onChange={(e) => setResetPasswordData(p => ({ ...p, confirmPassword: e.target.value }))} className={inputClass} />
              {resetPasswordErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{resetPasswordErrors.confirmPassword}</p>}
            </div>
            <div className="flex justify-end pt-2 gap-3">
              <button type="button" onClick={() => setIsResetPasswordModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded-md">انصراف</button>
              <button type="submit" disabled={isSubmittingReset} className="px-4 py-2 bg-yellow-500 text-white rounded-md">{isSubmittingReset ? 'در حال ذخیره...' : 'بازنشانی'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete User */}
      {isDeleteUserModalOpen && deletingUser && (
        <Modal title={`تایید حذف کاربر: ${deletingUser.username}`} onClose={() => setIsDeleteUserModalOpen(false)}>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">آیا از حذف این کاربر مطمئن هستید؟ این عمل قابل بازگشت نیست.</p>
          <div className="flex justify-end pt-3 gap-3">
            <button type="button" onClick={() => setIsDeleteUserModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded-md">انصراف</button>
            <button onClick={handleDeleteUser} disabled={isDeletingUser} className="px-4 py-2 bg-red-600 text-white rounded-md">
              {isDeletingUser ? 'در حال حذف...' : 'حذف'}
            </button>
          </div>
        </Modal>
      )}

		{/* SMS Pattern Test Modal */}
		<SmsPatternTestModal
			isOpen={smsTestOpen}
			onClose={() => setSmsTestOpen(false)}
			title={smsTestTitle}
			bodyId={smsTestBodyId}
			tokenLabels={smsTestTokenLabels}
		/>

		{/* SMS Pattern Preview Modal */}
		<SmsPatternPreviewModal
			isOpen={smsPrevOpen}
			onClose={() => setSmsPrevOpen(false)}
			title={smsPrevTitle}
			tokenLabels={smsPrevTokenLabels}
			previewTemplate={smsPrevTemplate}
		/>

		{/* SMS Bulk Test Modal */}
		<SmsBulkTestModal
			isOpen={smsBulkOpen}
			onClose={() => setSmsBulkOpen(false)}
			patterns={meliPatternDefs}
			defaultSelectedKeys={smsBulkDefaults}
			getBodyId={(key) => String((businessInfo as any)[key] || '')}
		/>
    </div>
  </PageShell>
  );
};

export default Settings;