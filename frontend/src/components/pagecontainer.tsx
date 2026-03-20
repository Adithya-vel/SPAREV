type PageContainerProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

const PageContainer = ({ title, subtitle, children }: PageContainerProps) => {
  return (
    <section className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Operations Console</p>
        <h1>{title}</h1>
        {subtitle ? <p className="subtitle">{subtitle}</p> : null}
      </header>

      <div className="stack">{children}</div>
    </section>
  );
};

export default PageContainer;
