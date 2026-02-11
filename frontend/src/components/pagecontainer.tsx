type PageContainerProps = {
  title: string;
  children: React.ReactNode;
};

const PageContainer = ({ title, children }: PageContainerProps) => {
  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ marginBottom: "1.5rem" }}>{title}</h2>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {children}
      </div>
    </div>
  );
};

export default PageContainer;
