interface ButtonProps {
  text: string;
  onClick?: () => void;
  className?: string;
}

const Button = ({ text, onClick, className = "" }: ButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={`button ${className}`.trim()}
    >
      {text}
    </button>
  );
};

export default Button;
