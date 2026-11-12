import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownToLine, ArrowLeft, BadgeCheck, Bell, BriefcaseBusiness,
  Check, CheckCircle2, ChevronDown, CircleDollarSign, Clock3, CreditCard,
  ExternalLink, Eye, FileCheck2, Filter, Headphones, LayoutDashboard, LogOut,
  Menu, MessageCircle, Plus, Search, Settings, ShieldCheck, ShoppingBag,
  Sparkles, Wallet, X, Instagram, Youtube, Users, UploadCloud, ClipboardList,
  AlertCircle, TrendingUp, CircleHelp, PanelRightClose
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from './supabase';
import './styles.css';

const demoServices = [
  { id: 's1', title: 'تصميم صورة مصغرة ليوتيوب', category: 'YouTube', price: 800, icon: 'youtube', desc: 'تصميم احترافي يجذب الانتباه ويزيد وضوح محتوى الفيديو.' },
  { id: 's2', title: 'مونتاج فيديو Reels', category: 'Instagram', price: 1200, icon: 'instagram', desc: 'مونتاج قصير مع انتقالات وعناوين وترجمة عند الحاجة.' },
  { id: 's3', title: 'مونتاج فيديو TikTok', category: 'TikTok', price: 1000, icon: 'tiktok', desc: 'تحرير فيديو عمودي مناسب للنشر على تيك توك.' },
  { id: 's4', title: 'كتابة وصف وعنوان SEO', category: 'YouTube', price: 500, icon: 'youtube', desc: 'صياغة عنوان ووصف واضحين ومتوافقين مع موضوع الفيديو.' },
  { id: 's5', title: 'تصميم 5 منشورات Instagram', category: 'Instagram', price: 1800, icon: 'instagram', desc: 'حزمة منشورات متناسقة بصيغة جاهزة للنشر.' },
  { id: 's6', title: 'إدارة محتوى أسبوعية', category: 'إدارة الحسابات', price: 3500, icon: 'spark', desc: 'تنظيم أفكار وجدول محتوى أسبوعي للحساب.' },
];

const demoOrders = [
  { id: 'ST-1048', title: 'مونتاج فيديو TikTok', customer: 'عميل تجريبي', worker: 'غير معيّن', amount: 1000, currency: 'DZD', status: 'open', date: 'اليوم 10:24' },
  { id: 'ST-1047', title: 'تصميم صورة مصغرة ليوتيوب', customer: 'مريم', worker: 'أمين', amount: 800, currency: 'DZD', status: 'submitted', date: 'اليوم 09:10' },
  { id: 'ST-1046', title: 'تصميم 5 منشورات Instagram', customer: 'ياسين', worker: 'سارة', amount: 1800, currency: 'DZD', status: 'in_progress', date: 'أمس 18:42' },
  { id: 'ST-1045', title: 'كتابة وصف وعنوان SEO', customer: 'عميل تجريبي', worker: 'غير معيّن', amount: 500, currency: 'DZD', status: 'awaiting_payment', date: 'أمس 15:30' },
];

const statusMap = {
  awaiting_payment: ['بانتظار الدفع', 'warning'],
  open: ['متاح للتنفيذ', 'blue'],
  in_progress: ['قيد التنفيذ', 'purple'],
  submitted: ['بانتظار المراجعة', 'warning'],
  revision_requested: ['مطلوب تعديل', 'danger'],
  completed: ['مكتمل', 'success'],
  cancelled: ['ملغي', 'muted'],
  refunded: ['مسترجع', 'muted'],
};

function ServiceIcon({ service, size=18 }) {
  if (service.category === 'YouTube') return <Youtube size={size}/>;
  if (service.category === 'Instagram') return <Instagram size={size}/>;
  if (service.category === 'TikTok') return <span className="tiktok-mark">♪</span>;
  return <Sparkles size={size}/>;
}
function Status({ status }) {
  const [label, tone] = statusMap[status] || ['غير معروف', 'muted'];
  return <span className={`status ${tone}`}><i />{label}</span>;
}
function money(n, currency='DZD') {
  return `${Number(n || 0).toLocaleString('fr-FR')} ${currency === 'DZD' ? 'دج' : currency}`;
}
function initials(name='مستخدم') { return name.trim().slice(0, 1); }

export default function App() {
  const [role, setRole] = useState('customer');
  const [page, setPage] = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [services, setServices] = useState(demoServices);
  const [orders, setOrders] = useState(demoOrders);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [commission, setCommission] = useState(20);
  const [payments, setPayments] = useState([
    { id: 'PAY-2201', order: 'ST-1047', method: 'BaridiMob', amount: 800, status: 'under_review', user: 'مريم' },
    { id: 'PAY-2200', order: 'ST-1045', method: 'Binance Pay', amount: 500, status: 'pending', user: 'عميل تجريبي' },
  ]);
  const [withdrawals, setWithdrawals] = useState([
    { id: 'WD-090', user: 'أمين', amount: 2400, method: 'BaridiMob', status: 'requested' },
  ]);
  const [profile, setProfile] = useState({ name: 'زائر SocialTask', email: '' });
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const nav = useMemo(() => role === 'customer' ? [
    ['overview', 'نظرة عامة', LayoutDashboard], ['services', 'استكشف الخدمات', ShoppingBag],
    ['myorders', 'طلباتي', ClipboardList], ['wallet', 'المحفظة', Wallet], ['support', 'المساعدة', Headphones]
  ] : role === 'worker' ? [
    ['overview', 'نظرة عامة', LayoutDashboard], ['market', 'الطلبات المتاحة', BriefcaseBusiness],
    ['mywork', 'أعمالي', ClipboardList], ['wallet', 'الأرباح والمحفظة', Wallet], ['support', 'المساعدة', Headphones]
  ] : [
    ['overview', 'لوحة المعلومات', LayoutDashboard], ['orders', 'إدارة الطلبات', ClipboardList],
    ['payments', 'المدفوعات', CreditCard], ['users', 'المستخدمون', Users],
    ['withdrawals', 'طلبات السحب', ArrowDownToLine], ['settings', 'إعدادات المنصة', Settings]
  ], [role]);

  const filteredOrders = orders.filter(o => {
    const q = search.toLowerCase();
    const match = !q || `${o.id} ${o.title} ${o.customer} ${o.worker}`.toLowerCase().includes(q);
    return match && (filter === 'all' || o.status === filter);
  });

  async function signIn(email, password) {
    if (!isSupabaseConfigured) { setToast('أضف بيانات Supabase في ملف .env أولاً لتفعيل تسجيل الدخول.'); return; }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setToast(error.message);
  }
  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setSession(null); setToast('تم تسجيل الخروج');
  }
  async function createOrder(data) {
    const order = { id: `ST-${Math.floor(1000 + Math.random()*8999)}`, title: data.title, customer: profile.name, worker: 'غير معيّن', amount: Number(data.amount), currency: 'DZD', status: 'awaiting_payment', date: 'الآن', requirements: data.requirements };
    if (supabase && session) {
      const { error } = await supabase.from('orders').insert({
        customer_id: session.user.id, title: data.title, requirements: data.requirements || '',
        target_url: data.url || null, quantity: Number(data.quantity || 1),
        gross_amount: Number(data.amount), commission_rate: commission,
        worker_amount: Number(data.amount) * (1 - commission/100),
        platform_amount: Number(data.amount) * commission/100, currency: 'DZD'
      });
      if (error) { setToast(`تعذر إنشاء الطلب: ${error.message}`); return; }
    } else {
      setOrders(prev => [order, ...prev]);
    }
    setModal({ type: 'payment', order });
  }
  function submitPayment(order, method, proof) {
    const payment = { id: `PAY-${Math.floor(1000+Math.random()*8999)}`, order: order.id, method, amount: order.amount, status: 'under_review', user: profile.name, proof };
    setPayments(prev => [payment, ...prev]);
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'awaiting_payment' } : o));
    setModal(null); setToast('تم إرسال إثبات الدفع. ستتم مراجعته من الإدارة.');
  }
  function claimOrder(orderId) {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, worker: profile.name, status: 'in_progress' } : o));
    setToast('تم حجز الطلب بنجاح');
  }
  function submitWork(orderId, proof) {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'submitted', proof } : o));
    setToast('تم إرسال العمل للمراجعة');
  }
  function approvePayment(id) {
    const p = payments.find(x => x.id === id);
    setPayments(prev => prev.map(x => x.id === id ? { ...x, status: 'confirmed' } : x));
    setOrders(prev => prev.map(o => o.id === p?.order ? { ...o, status: 'open' } : o));
    setToast('تم تأكيد الدفع وفتح الطلب للمنفذين');
  }
  function approveWork(id) {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'completed' } : o));
    setToast('تم اعتماد الإنجاز. يجب تنفيذ قيد المحفظة عبر إجراء خادمي آمن.');
  }
  function updateWithdrawal(id, status) {
    setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status } : w));
    setToast('تم تحديث طلب السحب');
  }

  const title = nav.find(n => n[0] === page)?.[1] || 'نظرة عامة';

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="brand"><div className="brand-icon"><Sparkles size={21}/></div><div><b>SocialTask</b><small>سوق الخدمات الرقمية</small></div><button className="icon-btn mobile-close" onClick={()=>setMobileOpen(false)}><X/></button></div>
      <div className="workspace-label">مساحة العمل</div>
      <div className="role-switch">
        <button className={role==='customer'?'active':''} onClick={()=>{setRole('customer');setPage('overview');setMobileOpen(false)}}>عميل</button>
        <button className={role==='worker'?'active':''} onClick={()=>{setRole('worker');setPage('overview');setMobileOpen(false)}}>منفذ</button>
        <button className={role==='admin'?'active':''} onClick={()=>{setRole('admin');setPage('overview');setMobileOpen(false)}}>إدارة</button>
      </div>
      <nav className="nav-list">
        <span className="nav-caption">القائمة الرئيسية</span>
        {nav.map(([id,label,Icon])=><button key={id} className={`nav-item ${page===id?'selected':''}`} onClick={()=>{setPage(id);setMobileOpen(false)}}><Icon size={18}/><span>{label}</span>{id==='payments'&&<em>{payments.filter(p=>p.status!=='confirmed').length}</em>}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="help-card"><div className="help-icon"><MessageCircle size={17}/></div><b>تحتاج مساعدة؟</b><p>فريقنا هنا لمساعدتك في رحلتك.</p><button onClick={()=>setPage('support')}>تواصل معنا <ArrowLeft size={14}/></button></div>
        <div className="user-mini"><div className="avatar">{initials(profile.name)}</div><div className="user-info"><b>{profile.name}</b><small>{role==='admin'?'مدير المنصة':role==='worker'?'منفذ خدمات':'حساب عميل'}</small></div><button className="icon-btn" onClick={signOut}><LogOut size={17}/></button></div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="topbar-start"><button className="icon-btn menu-btn" onClick={()=>setMobileOpen(true)}><Menu/></button><div><div className="breadcrumb">SocialTask <span>/</span> {title}</div><h1>{title}</h1></div></div>
        <div className="topbar-actions">
          <div className="secure-chip"><ShieldCheck size={15}/> بيئة آمنة</div>
          <button className="icon-btn notification" onClick={()=>setToast('لا توجد إشعارات جديدة')}><Bell size={18}/><i/></button>
          <button className="avatar top-avatar" onClick={()=>setModal({type:'profile'})}>{initials(profile.name)}</button>
        </div>
      </header>
      <div className="content">
        {page==='overview' && <Overview role={role} orders={orders} payments={payments} withdrawals={withdrawals} services={services} onNavigate={setPage} onCreate={()=>setModal({type:'create'})} />}
        {page==='services' && <Services services={services} onCreate={()=>setModal({type:'create'})}/>}
        {page==='myorders' && <Orders orders={orders.filter(o=>o.customer===profile.name || o.customer==='عميل تجريبي')} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter}/>}
        {page==='market' && <WorkerMarket orders={orders.filter(o=>o.status==='open')} onClaim={claimOrder}/>}
        {page==='mywork' && <WorkerWork orders={orders.filter(o=>o.worker===profile.name)} onSubmit={submitWork}/>}
        {page==='orders' && <Orders orders={filteredOrders} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} admin onApprove={approveWork}/>}
        {page==='payments' && <Payments payments={payments} onApprove={approvePayment}/>}
        {page==='wallet' && <WalletPage role={role} onWithdraw={()=>setModal({type:'withdraw'})}/>}
        {page==='users' && <UsersPage/>}
        {page==='withdrawals' && <Withdrawals withdrawals={withdrawals} onUpdate={updateWithdrawal}/>}
        {page==='settings' && <SettingsPage commission={commission} setCommission={setCommission} services={services} setServices={setServices}/>}
        {page==='support' && <Support/>}
      </div>
      <footer className="footer"><span>© 2026 SocialTask. جميع الحقوق محفوظة.</span><span><span className="live-dot"/> النظام يعمل بنسخة تجريبية</span></footer>
    </main>

    {mobileOpen && <div className="mobile-scrim" onClick={()=>setMobileOpen(false)}/>}
    {modal && <Modal modal={modal} onClose={()=>setModal(null)} onCreate={createOrder} onPayment={submitPayment} onWithdraw={(data)=>{setWithdrawals(p=>[{id:`WD-${Math.floor(100+Math.random()*899)}`,user:profile.name,...data,status:'requested'},...p]);setModal(null);setToast('تم إرسال طلب السحب للمراجعة')}} onSignIn={signIn}/>}
    {toast && <div className="toast"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast('')}><X size={15}/></button></div>}
  </div>;
}

function PageIntro({eyebrow, title, desc, action}) {
  return <div className="page-intro"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2><p>{desc}</p></div>{action}</div>;
}
function Overview({role,orders,payments,withdrawals,services,onNavigate,onCreate}) {
  const isAdmin=role==='admin', isWorker=role==='worker';
  const stats = isAdmin ? [
    ['إجمالي الطلبات',orders.length,ClipboardList,'#8b7cff','+12.5%'],
    ['مدفوعات قيد المراجعة',payments.filter(p=>p.status!=='confirmed').length,CreditCard,'#f0b45b','تحتاج متابعة'],
    ['طلبات السحب',withdrawals.filter(w=>w.status==='requested').length,ArrowDownToLine,'#46c9a0','بانتظار القرار'],
    ['الخدمات النشطة',services.length,Sparkles,'#5b9dff','متاحة للعملاء']
  ] : isWorker ? [
    ['طلبات متاحة',orders.filter(o=>o.status==='open').length,BriefcaseBusiness,'#8b7cff','فرص جديدة'],
    ['أعمال قيد التنفيذ',orders.filter(o=>o.status==='in_progress').length,Activity,'#5b9dff','تابع تقدمك'],
    ['أعمال مكتملة',orders.filter(o=>o.status==='completed').length,CheckCircle2,'#46c9a0','أحسنت'],
    ['رصيدك المتاح', '0 دج', Wallet,'#f0b45b','نسخة تجريبية']
  ] : [
    ['طلباتي',orders.length,ShoppingBag,'#8b7cff','تابع طلباتك'],
    ['قيد التنفيذ',orders.filter(o=>o.status==='in_progress').length,Activity,'#5b9dff','تقدم العمل'],
    ['مكتملة',orders.filter(o=>o.status==='completed').length,CheckCircle2,'#46c9a0','طلبات منجزة'],
    ['الخدمات',services.length,Sparkles,'#f0b45b','اكتشف المزيد']
  ];
  const recent = [...orders].slice(0,4);
  return <>
    <div className="welcome-banner"><div className="welcome-copy"><span className="welcome-tag"><Sparkles size={13}/> أهلاً بك في SocialTask</span><h2>{isAdmin?'تحكم كامل في منصتك.':isWorker?'حوّل مهاراتك إلى دخل إضافي.':'أنجز أعمالك الرقمية بسهولة.'}</h2><p>{isAdmin?'تابع نشاط المنصة والمدفوعات والطلبات من مكان واحد.':isWorker?'اكتشف فرص العمل، نفّذ الخدمات، واجمع أرباحك.':'اختر الخدمة المناسبة، أرسل طلبك، وتابع التنفيذ خطوة بخطوة.'}</p><button className="primary-btn" onClick={()=>isAdmin?onNavigate('payments'):isWorker?onNavigate('market'):onCreate()}>{isAdmin?'مراجعة المدفوعات':isWorker?'استكشف الطلبات':'إنشاء طلب جديد'} <ArrowLeft size={16}/></button></div><div className="banner-art"><div className="orb orb-one"/><div className="orb orb-two"/><div className="banner-card"><div className="banner-card-icon"><Sparkles/></div><b>SocialTask</b><span>مهاراتك تصنع الفرق</span><div className="banner-card-line"/></div></div></div>
    <div className="stats-grid">{stats.map(([label,value,Icon,color,foot])=><div className="stat-card" key={label}><div className="stat-top"><span>{label}</span><div className="stat-icon" style={{'--accent':color}}><Icon size={19}/></div></div><strong>{value}</strong><small>{foot}</small></div>)}</div>
    <div className="section-heading"><div><h3>{isWorker?'فرص عمل مناسبة':isAdmin?'أحدث نشاط المنصة':'الخدمات الأكثر طلباً'}</h3><p>{isWorker?'طلبات بانتظار منفذ':isAdmin?'آخر الطلبات المسجلة':'ابدأ بخدمة رقمية تناسب احتياجك'}</p></div><button className="text-btn" onClick={()=>onNavigate(isWorker?'market':isAdmin?'orders':'services')}>عرض الكل <ArrowLeft size={15}/></button></div>
    {isWorker ? <WorkerMarket orders={orders.filter(o=>o.status==='open').slice(0,3)} onClaim={()=>{}} compact/> :
      isAdmin ? <OrdersTable orders={recent}/> :
      <div className="service-grid">{services.slice(0,3).map(s=><ServiceCard key={s.id} service={s} onClick={onCreate}/>)}</div>}
  </>;
}
function ServiceCard({service,onClick}) {
  return <div className="service-card"><div className="service-card-top"><div className={`service-icon ${service.category==='YouTube'?'yt':service.category==='Instagram'?'ig':'other'}`}><ServiceIcon service={service}/></div><span className="service-category">{service.category}</span></div><h4>{service.title}</h4><p>{service.desc}</p><div className="service-card-bottom"><div><small>ابتداءً من</small><b>{money(service.price)}</b></div><button className="round-arrow" onClick={onClick}><ArrowLeft size={17}/></button></div></div>;
}
function Services({services,onCreate}) {
  const [cat,setCat]=useState('الكل');
  const cats=['الكل','TikTok','YouTube','Instagram','إدارة الحسابات'];
  const shown=services.filter(s=>cat==='الكل'||s.category===cat);
  return <><PageIntro eyebrow="كتالوج الخدمات" title="اختر الخدمة التي تناسبك" desc="خدمات رقمية ينفذها مستقلون، مع متابعة الطلب حتى التسليم."/><div className="filter-pills">{cats.map(c=><button key={c} className={cat===c?'active':''} onClick={()=>setCat(c)}>{c}</button>)}</div><div className="service-grid">{shown.map(s=><ServiceCard key={s.id} service={s} onClick={onCreate}/>)}</div></>;
}
function Orders({orders,search,setSearch,filter,setFilter,admin=false,onApprove}) {
  return <><PageIntro eyebrow={admin?'إدارة المنصة':'مساحة العميل'} title={admin?'إدارة جميع الطلبات':'طلباتك في مكان واحد'} desc={admin?'راجع حالة الطلبات واعتمد الأعمال المقدمة.':'تابع تفاصيل طلباتك وحالة كل خدمة.'}/><div className="table-toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث برقم الطلب أو الخدمة..."/></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">كل الحالات</option>{Object.entries(statusMap).map(([k,v])=><option value={k} key={k}>{v[0]}</option>)}</select></div><div className="table-card"><OrdersTable orders={orders} admin={admin} onApprove={onApprove}/></div></>;
}
function OrdersTable({orders,admin=false,onApprove}) {
  return <div className="table-wrap"><table><thead><tr><th>رقم الطلب</th><th>الخدمة</th><th>{admin?'العميل':'المنفذ'}</th><th>القيمة</th><th>الحالة</th><th>التاريخ</th>{admin&&<th>إجراء</th>}</tr></thead><tbody>{orders.length===0?<tr><td colSpan="7" className="empty-cell">لا توجد طلبات لعرضها حالياً.</td></tr>:orders.map(o=><tr key={o.id}><td><b className="order-id">{o.id}</b></td><td><strong>{o.title}</strong></td><td>{admin?o.customer:o.worker}</td><td>{money(o.amount)}</td><td><Status status={o.status}/></td><td>{o.date}</td>{admin&&<td>{o.status==='submitted'?<button className="small-primary" onClick={()=>onApprove?.(o.id)}>اعتماد الإنجاز</button>:<span className="muted-text">—</span>}</td>}</tr>)}</tbody></table></div>;
}
function WorkerMarket({orders,onClaim,compact=false}) {
  return <div className={compact?'worker-list compact':'worker-list'}>{orders.length===0?<div className="empty-state"><BriefcaseBusiness size={30}/><b>لا توجد طلبات متاحة الآن</b><span>ستظهر هنا الطلبات التي تم تأكيد دفعها.</span></div>:orders.map(o=><div className="work-card" key={o.id}><div className="work-main"><div className="work-icon"><BriefcaseBusiness size={20}/></div><div><span className="order-id">{o.id}</span><h4>{o.title}</h4><p>العميل: {o.customer} · {o.date}</p></div></div><div className="work-side"><b>{money(o.amount*.8)}</b><small>صافي المنفذ · تقديري</small><button className="primary-btn small" onClick={()=>onClaim(o.id)}>حجز الطلب</button></div></div>)}</div>;
}
function WorkerWork({orders,onSubmit}) {
  return <><PageIntro eyebrow="مساحة المنفذ" title="أعمالي الحالية" desc="أرسل إثبات الإنجاز بعد إكمال متطلبات العميل."/><div className="worker-list">{orders.length===0?<div className="empty-state"><ClipboardList size={30}/><b>لم تحجز أي طلب بعد</b><span>انتقل إلى الطلبات المتاحة لاختيار عمل جديد.</span></div>:orders.map(o=><div className="work-card" key={o.id}><div className="work-main"><div className="work-icon"><ClipboardList/></div><div><span className="order-id">{o.id}</span><h4>{o.title}</h4><Status status={o.status}/></div></div><div className="work-side">{o.status==='in_progress'?<button className="primary-btn small" onClick={()=>onSubmit(o.id,prompt('ضع رابط أو وصف إثبات الإنجاز')||'تم الإنجاز')}>إرسال الإنجاز</button>:<span className="muted-text">بانتظار المراجعة</span>}</div></div>)}</div></>;
}
function Payments({payments,onApprove}) {
  return <><PageIntro eyebrow="المالية" title="مراجعة المدفوعات" desc="تحقق من بيانات التحويل وإثبات الدفع قبل فتح الطلب للمنفذين."/><div className="notice warning-notice"><AlertCircle size={18}/><span>تأكيد الدفع هنا تجريبي في الواجهة. في الإنتاج يجب التحقق من التحويل فعلياً قبل اعتماد العملية.</span></div><div className="table-card"><div className="table-wrap"><table><thead><tr><th>رقم العملية</th><th>الطلب</th><th>صاحب الدفع</th><th>الطريقة</th><th>المبلغ</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>{payments.map(p=><tr key={p.id}><td><b className="order-id">{p.id}</b></td><td>{p.order}</td><td>{p.user}</td><td>{p.method}</td><td>{money(p.amount)}</td><td><Status status={p.status==='confirmed'?'completed':p.status==='under_review'?'submitted':'awaiting_payment'}/></td><td>{p.status!=='confirmed'?<button className="small-primary" onClick={()=>onApprove(p.id)}>تأكيد الدفع</button>:<span className="success-text"><Check size={15}/> مؤكد</span>}</td></tr>)}</tbody></table></div></div></>;
}
function WalletPage({role,onWithdraw}) {
  return <><PageIntro eyebrow="المحفظة" title={role==='customer'?'المدفوعات والمحفظة':'أرباحك ومحفظتك'} desc="تابع رصيدك وحركة العمليات المالية بكل وضوح." action={role==='worker'?<button className="primary-btn" onClick={onWithdraw}><ArrowDownToLine size={16}/> طلب سحب</button>:null}/><div className="wallet-grid"><div className="balance-card"><span>الرصيد المتاح</span><strong>{role==='worker'?'0':'0'} <small>دج</small></strong><div className="balance-foot"><span><ShieldCheck size={15}/> رصيد محمي</span><span>تجريبي</span></div></div><div className="balance-card secondary-balance"><span>الرصيد قيد المعالجة</span><strong>0 <small>دج</small></strong><div className="balance-foot"><span><Clock3 size={15}/> يتم تحديثه بعد المراجعة</span></div></div></div><div className="table-card empty-state"><Wallet size={28}/><b>لا توجد حركات مالية بعد</b><span>ستظهر هنا الأرباح والمدفوعات وطلبات السحب.</span></div></>;
}
function UsersPage() {
  return <><PageIntro eyebrow="إدارة المنصة" title="المستخدمون" desc="قائمة الحسابات وأدوارها ونشاطها."/><div className="notice"><ShieldCheck size={18}/> بيانات المستخدمين الفعلية تظهر بعد ربط Supabase وتفعيل حساب الإدارة.</div><div className="table-card empty-state"><Users size={30}/><b>لا توجد بيانات متصلة</b><span>اربط إعدادات Supabase لعرض الحسابات الحقيقية.</span></div></>;
}
function Withdrawals({withdrawals,onUpdate}) {
  return <><PageIntro eyebrow="المالية" title="طلبات سحب الأرباح" desc="راجع بيانات السحب، ثم حدّث الحالة بعد تنفيذ التحويل فعلياً."/><div className="table-card"><div className="table-wrap"><table><thead><tr><th>رقم الطلب</th><th>المستخدم</th><th>المبلغ</th><th>الطريقة</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>{withdrawals.map(w=><tr key={w.id}><td className="order-id">{w.id}</td><td>{w.user}</td><td>{money(w.amount)}</td><td>{w.method}</td><td><Status status={w.status==='paid'?'completed':w.status==='rejected'?'cancelled':'submitted'}/></td><td>{w.status==='requested'?<div className="inline-actions"><button className="small-primary" onClick={()=>onUpdate(w.id,'paid')}>تأكيد التحويل</button><button className="small-danger" onClick={()=>onUpdate(w.id,'rejected')}>رفض</button></div>:<span className="muted-text">تمت المراجعة</span>}</td></tr>)}</tbody></table></div></div></>;
}
function SettingsPage({commission,setCommission,services,setServices}) {
  return <><PageIntro eyebrow="إعدادات النظام" title="إعدادات المنصة" desc="تحكم في العمولة والخدمات وسياسات التشغيل."/><div className="settings-grid"><div className="panel"><div className="panel-heading"><div className="panel-icon"><CircleDollarSign/></div><div><h3>عمولة المنصة</h3><p>تُطبّق على الطلبات الجديدة فقط.</p></div></div><label className="field-label">نسبة العمولة الحالية</label><div className="commission-control"><input type="number" min="0" max="100" value={commission} onChange={e=>setCommission(Math.max(0,Math.min(100,Number(e.target.value))))}/><span>%</span></div><div className="range-line"><input type="range" min="0" max="50" value={Math.min(50,commission)} onChange={e=>setCommission(Number(e.target.value))}/></div><div className="calc-preview"><span>مثال على طلب بقيمة 1,000 دج</span><div><b>عمولة المنصة: {commission*10} دج</b><b>المنفذ: {1000-commission*10} دج</b></div></div></div><div className="panel"><div className="panel-heading"><div className="panel-icon"><CreditCard/></div><div><h3>وسائل الدفع</h3><p>التحقق اليدوي من الإيصالات.</p></div></div><div className="payment-method-row"><div className="payment-logo">ب</div><div><b>BaridiMob</b><small>تحويل بريدي · تحقق يدوي</small></div><span className="status success"><i/> مفعّل</span></div><div className="payment-method-row"><div className="payment-logo binance">B</div><div><b>Binance Pay</b><small>إثبات التحويل · تحقق يدوي</small></div><span className="status success"><i/> مفعّل يدوياً</span></div></div><div className="panel full-panel"><div className="panel-heading"><div className="panel-icon"><ShoppingBag/></div><div><h3>كتالوج الخدمات</h3><p>الخدمات التي تظهر للعملاء.</p></div></div>{services.map(s=><div className="service-admin-row" key={s.id}><div><b>{s.title}</b><small>{s.category}</small></div><strong>{money(s.price)}</strong><span className="status success"><i/> نشطة</span></div>)}</div></div></>;
}
function Support() {
  return <><PageIntro eyebrow="مركز المساعدة" title="كيف يمكننا مساعدتك؟" desc="إذا واجهت مشكلة في طلب أو دفعة، تواصل مع فريق الدعم."/><div className="support-grid"><div className="panel"><div className="panel-icon"><MessageCircle/></div><h3>الدعم عبر واتساب</h3><p>أرسل رقم الطلب ووصف المشكلة لفريق الدعم.</p><a className="primary-btn link-btn" href="https://wa.me/" target="_blank" rel="noreferrer">فتح واتساب <ExternalLink size={15}/></a></div><div className="panel"><div className="panel-icon"><CircleHelp/></div><h3>الأسئلة الشائعة</h3><p>الدفع لا يعني اعتماد الطلب مباشرة؛ تتم مراجعة الإثبات أولاً. كما تُراجع الأعمال قبل اعتماد الأرباح.</p></div></div></>;
}
function Modal({modal,onClose,onCreate,onPayment,onWithdraw,onSignIn}) {
  const [form,setForm]=useState({title:'',amount:'',requirements:'',url:'',quantity:1,method:'BaridiMob',proof:'',email:'',password:'',payout_method:'BaridiMob',payout_details:''});
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  const [createdOrder,setCreatedOrder]=useState(null);
  const title=modal.type==='create'?'إنشاء طلب جديد':modal.type==='payment'?'إرسال إثبات الدفع':modal.type==='withdraw'?'طلب سحب الأرباح':modal.type==='profile'?'حسابك':'تسجيل الدخول';
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">SocialTask</span><h3>{title}</h3></div><button className="icon-btn" onClick={onClose}><X/></button></div>
    {modal.type==='create'&&<form onSubmit={e=>{e.preventDefault();onCreate(form)}}><label>الخدمة المطلوبة</label><select required value={form.title} onChange={e=>{const s=demoServices.find(x=>x.title===e.target.value);set('title',e.target.value);if(s)set('amount',s.price)}}><option value="">اختر الخدمة</option>{demoServices.map(s=><option key={s.id} value={s.title}>{s.title}</option>)}</select><label>الميزانية (دج)</label><input type="number" required min="100" value={form.amount} onChange={e=>set('amount',e.target.value)} placeholder="مثلاً 1000"/><label>رابط الحساب أو المحتوى (اختياري)</label><input value={form.url} onChange={e=>set('url',e.target.value)} placeholder="https://..."/><label>تفاصيل ومتطلبات التنفيذ</label><textarea required rows="3" value={form.requirements} onChange={e=>set('requirements',e.target.value)} placeholder="اشرح ما تحتاجه بالتحديد..."/><button className="primary-btn full-btn" type="submit">متابعة إلى الدفع <ArrowLeft size={16}/></button></form>}
    {modal.type==='payment'&&<form onSubmit={e=>{e.preventDefault();onPayment(modal.order,form.method,form.proof)}}><div className="payment-summary"><span>المبلغ المطلوب</span><b>{money(modal.order.amount)}</b><small>الطلب {modal.order.id}</small></div><label>طريقة الدفع</label><select value={form.method} onChange={e=>set('method',e.target.value)}><option>BaridiMob</option><option>Binance Pay</option></select><div className="notice">حوّل المبلغ إلى بيانات الدفع الرسمية التي توفرها الإدارة، ثم أرفق مرجع العملية أو رابط صورة الإيصال.</div><label>مرجع التحويل أو رابط إثبات الدفع</label><textarea required rows="3" value={form.proof} onChange={e=>set('proof',e.target.value)} placeholder="رقم العملية أو رابط صورة الإيصال..."/><button className="primary-btn full-btn" type="submit">إرسال الإثبات للمراجعة <ArrowLeft size={16}/></button></form>}
    {modal.type==='withdraw'&&<form onSubmit={e=>{e.preventDefault();onWithdraw({amount:Number(form.amount),method:form.payout_method,details:form.payout_details})}}><label>المبلغ (دج)</label><input type="number" min="500" required value={form.amount||''} onChange={e=>set('amount',e.target.value)} placeholder="500"/><label>طريقة استلام الأرباح</label><select value={form.payout_method} onChange={e=>set('payout_method',e.target.value)}><option>BaridiMob</option><option>CCP</option><option>Binance Pay</option></select><label>بيانات الاستلام</label><textarea required rows="3" value={form.payout_details} onChange={e=>set('payout_details',e.target.value)} placeholder="أدخل بيانات الاستلام..."/><button className="primary-btn full-btn">إرسال طلب السحب</button></form>}
    {modal.type==='profile'&&<div className="profile-modal"><div className="avatar big">{initials('زائر SocialTask')}</div><b>زائر SocialTask</b><p>هذه واجهة استعراضية. اربط Supabase لتفعيل الحسابات والأدوار الحقيقية.</p><button className="secondary-btn full-btn" onClick={()=>onClose()}>إغلاق</button></div>}
    {modal.type==='login'&&<form onSubmit={e=>{e.preventDefault();onSignIn(form.email,form.password);onClose()}}><label>البريد الإلكتروني</label><input type="email" required value={form.email} onChange={e=>set('email',e.target.value)}/><label>كلمة المرور</label><input type="password" required value={form.password} onChange={e=>set('password',e.target.value)}/><button className="primary-btn full-btn">تسجيل الدخول</button></form>}
  </div></div>;
}
