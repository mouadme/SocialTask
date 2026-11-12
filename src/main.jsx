import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    console.error('SocialTask render error:', error);
  }
  render() {
    if (this.state.error) {
      return (
        <main dir="rtl" style={{ minHeight: '100vh', background: '#0b0d12', color: '#eef0f6', fontFamily: 'sans-serif', display: 'grid', placeItems: 'center', padding: 24 }}>
          <section style={{ maxWidth: 560, background: '#151a25', border: '1px solid #353b4b', borderRadius: 16, padding: 24 }}>
            <h2>حدث خطأ أثناء تشغيل SocialTask</h2>
            <p style={{ color: '#aab2c2', lineHeight: 1.8 }}>لم تعد الصفحة بيضاء بصمت. انسخ رسالة الخطأ التالية وأرسلها للدعم التقني:</p>
            <pre style={{ direction: 'ltr', textAlign: 'left', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: '#ffb2b2', background: '#0b0d12', padding: 12, borderRadius: 8 }}>{String(this.state.error?.stack || this.state.error)}</pre>
            <button onClick={() => window.location.reload()} style={{ background: '#8066ef', color: 'white', border: 0, padding: '10px 16px', borderRadius: 8 }}>إعادة تحميل الصفحة</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  document.body.innerHTML = '<main style="direction:rtl;background:#0b0d12;color:white;padding:32px;font-family:sans-serif">لم يتم العثور على عنصر تشغيل التطبيق (#root). تأكد أنك تشغّل المشروع عبر Vite وليس بفتح ملف HTML مباشرة.</main>';
} else {
  createRoot(rootElement).render(
    <React.StrictMode>
      <AppErrorBoundary><App /></AppErrorBoundary>
    </React.StrictMode>
  );
}
