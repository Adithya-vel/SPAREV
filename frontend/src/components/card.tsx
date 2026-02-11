type CardProps = {
  children: React.ReactNode;
};

const Card = ({ children }: CardProps) => {
  return (
    <div
      style={{
        background: "#0f172a",
        padding: "1rem",
        borderRadius: "10px",
        minWidth: "220px",
        border: "1px solid #1e293b",
      }}
    >
      {children}
    </div>
  );
};

export default Card;
