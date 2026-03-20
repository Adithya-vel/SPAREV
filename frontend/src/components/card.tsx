type CardProps = {
  children: React.ReactNode;
  className?: string;
};

const Card = ({ children, className = "" }: CardProps) => <article className={`card ${className}`.trim()}>{children}</article>;

export default Card;
