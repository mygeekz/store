// pages/Login.tsx
import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Notification from '../components/Notification';
import { NotificationMessage } from '../types';
import LoginLogoMotionV3 from "../components/LoginLogoMotionV3";
import VariableProximityText from "../components/VariableProximityText";
import TrueFocusText from "../components/TrueFocusText";
import OrbBackdrop from "../components/OrbBackdrop";
import LiquidGlassPanel from "../components/LiquidGlassPanel";

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const { login, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setNotification(null);
    if (!username || !password) {
      setNotification({ type: 'error', text: 'نام کاربری و کلمه عبور الزامی است.' });
      return;
    }
    try {
      const res = await login({ username, password });
      if (res.success) {
        setNotification({ type: 'success', text: 'ورود با موفقیت انجام شد. در حال انتقال...' });
        setTimeout(() => navigate('/'), 1000);
      } else {
        setNotification({ type: 'error', text: res.message || 'خطا در ورود. لطفاً دوباره تلاش کنید.' });
      }
    } catch (err: any) {
      const m = err?.message?.toLowerCase?.() ?? "";
      let msg = 'خطا در ورود. لطفاً دوباره تلاش کنید.';
      if (m.includes('failed to fetch')) msg = 'خطا در ارتباط با سرور. اتصال اینترنت خود را بررسی کنید.';
      else if (m.includes('invalid credentials') || m.includes('نام کاربری یا کلمه عبور نامعتبر است')) msg = 'نام کاربری یا کلمه عبور نامعتبر است.';
      else if (err?.message) msg = err.message;
      setNotification({ type: 'error', text: msg });
    }
  };

  return (
    <div
      dir="rtl"
      className="relative bg-gradient-to-br from-slate-950 via-[#0b1020] to-indigo-950 text-right"
      style={{ minHeight: '100dvh' }} // دقت واقعی روی موبایل/دسکتاپ
    >
      {/* اورب: دقیقاً وسط، اندازه معقول */}
      <OrbBackdrop sizeVmin={120} x="50%" y="50%" hoverGlobal />

      {/* نوتیف ثابت و دقیقاً وسطِ بالا */}
      <Notification position="top-center" message={notification} onClose={() => setNotification(null)} />

      {/* سنتر کاملاً دقیق کارت */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        {/* برای حس زوم‌اوت؛ مرکزِ ترنسفورم هم وسطه تا جابه‌جایی نده */}
        <div className="origin-center scale-[0.9]">
          <LiquidGlassPanel
            className="w-[min(92vw,384px)] p-6 space-y-5 rounded-[20px]"
            blurPx={22}
            borderPx={1}
          >
            <div className="text-center">
              <LoginLogoMotionV3 />
              <TrueFocusText
                text="ورود به داشبورد"
                className="block mx-auto text-2xl font-extrabold text-gray-800 leading-tight"
                boxSize={110}
                radius={66}
                color="#8b5cf6"
                corner={12}
                thickness={2}
                blur={2.2}
                dim={0.42}
                autoCycle
                cycleHoldMs={1100}
                cycleAnimMs={420}
                pauseOnHover
                lockAxis="x"
              />
              <div className="mt-1">
                <VariableProximityText
                  text="لطفاً اطلاعات کاربری خود را وارد کنید."
                  className="text-sm text-gray-600"
                  mode="word"
                  radius={140}
                  maxScale={1.06}
                  minWght={300}
                  maxWght={800}
                  fallbackWeight
                />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="username" className="block text-xs font-medium text-gray-700 mb-1">نام کاربری</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <i className="fas fa-user text-gray-400" />
                  </span>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pr-10 pl-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-colors"
                    placeholder="نام کاربری خود را وارد کنید"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-1">کلمه عبور</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <i className="fas fa-lock text-gray-400" />
                  </span>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pr-10 pl-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-colors"
                    placeholder="کلمه عبور خود را وارد کنید"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 transition-all duration-150 ease-in-out group"
              >
                {authLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin ml-2" />
                    در حال ورود...
                  </>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <span className="shiny-text">ورود به سیستم</span>
                    <i className="fas fa-arrow-left mr-2 transform transition-transform group-hover:-translate-x-1" />
                  </span>
                )}
              </button>
            </form>

            <p className="text-center text-[10px] text-gray-500 mt-5">
              &copy; {new Date().getFullYear()} فروشگاه کوروش. تمامی حقوق محفوظ است.
            </p>
          </LiquidGlassPanel>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
