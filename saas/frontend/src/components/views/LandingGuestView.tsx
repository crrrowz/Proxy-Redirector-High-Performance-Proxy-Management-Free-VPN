import React from 'react';
import { ShieldCheck, Zap, Server, Key, ArrowRight, Lock } from 'lucide-react';

interface LandingGuestViewProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  lang: 'ar' | 'en';
}

export const LandingGuestView: React.FC<LandingGuestViewProps> = ({
  onOpenAuth,
  lang
}) => {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 0 60px 0' }}>
      {/* Hero Banner */}
      <div
        style={{
          textAlign: 'center',
          padding: '60px 24px',
          background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.08) 0%, transparent 100%)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '40px'
        }}
      >
        <span
          className="badge badge-emerald"
          style={{ marginBottom: '16px', padding: '6px 14px', fontSize: '12px' }}
        >
          <Zap size={13} /> {lang === 'ar' ? 'شبكة توجيه بروكسي مؤسسية سحابية' : 'Enterprise Residential & Cloud Relay Mesh'}
        </span>

        <h1
          style={{
            fontSize: '38px',
            fontWeight: 800,
            letterSpacing: '-1px',
            lineHeight: 1.2,
            marginBottom: '16px',
            color: 'var(--text-primary)'
          }}
        >
          {lang === 'ar'
            ? 'توجيه آمن، بروكسيات ثابتة مخصصة، وشبكة Relay فائقة السرعة'
            : 'Next-Gen Dedicated Static Proxies & Global Relay Network'}
        </h1>

        <p
          style={{
            fontSize: '16px',
            color: 'var(--text-secondary)',
            maxWidth: '680px',
            margin: '0 auto 28px auto',
            lineHeight: 1.6
          }}
        >
          {lang === 'ar'
            ? 'منصة سحابية متطورة لتوزيع حركة المرور، فحص الـ IPs السكنية، ومنع تسريب الـ DNS مع تشفير كامل عبر mTLS 1.3.'
            : 'High-performance SOCKS5/HTTP routing mesh, residential carrier IPs, and zero-leak DNS protection built for web intelligence.'}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            style={{ padding: '12px 28px', fontSize: '15px' }}
            onClick={() => onOpenAuth('login')}
          >
            <Lock size={16} /> {lang === 'ar' ? 'تسجيل الدخول إلى حسابك' : 'Sign In to Portal'}
          </button>
          <button
            className="btn btn-outline"
            style={{ padding: '12px 24px', fontSize: '15px' }}
            onClick={() => onOpenAuth('register')}
          >
            {lang === 'ar' ? 'إنشاء حساب جديد' : 'Create Free Account'} <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Feature Bento Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}
      >
        <div className="panel" style={{ padding: '24px', marginBottom: 0 }}>
          <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <ShieldCheck size={22} color="var(--accent-primary)" />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
            {lang === 'ar' ? 'بروكسيات سكنية نظيفة 100%' : '100% Clean ISP Static IPs'}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {lang === 'ar'
              ? 'عناوين IP ثابتة مخصصة من كبرى مزودي الاتصالات العالميين (AT&T, Deutsche Telekom, StarHub) مع مؤشر احتيال 0%.'
              : 'Dedicated static residential IPs from tier-1 telecom providers with guaranteed 0 fraud scores and 99.99% SLA.'}
          </p>
        </div>

        <div className="panel" style={{ padding: '24px', marginBottom: 0 }}>
          <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <Server size={22} color="var(--accent-emerald)" />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
            {lang === 'ar' ? 'شبكة Relays موزعة عالمياً' : 'Global Low-Latency Relays'}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {lang === 'ar'
              ? 'عقد توجيه موزعة في أمريكا، أوروبا، وآسيا مع زمن استجابة أقل من 25ms ودعم بروتوكولات gRPC و SOCKS5 و HTTP.'
              : 'Strategically located edge nodes in US, EU, and Asia Pacific with sub-25ms latency and full gRPC tunneling.'}
          </p>
        </div>

        <div className="panel" style={{ padding: '24px', marginBottom: 0 }}>
          <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <Key size={22} color="var(--accent-purple)" />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
            {lang === 'ar' ? 'مفاتيح API وتكامل برمجي' : 'Developer APIs & SDKs'}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {lang === 'ar'
              ? 'أكواد جاهزة للربط مع Python و Node.js و Go و cURL مع دعم تصدير ملفات Clash و Shadowrocket.'
              : 'Ready-to-use snippets for Python, Node.js, Go, cURL, plus instant Clash and Shadowrocket config downloads.'}
          </p>
        </div>
      </div>
    </div>
  );
};
