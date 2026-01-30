interface OutlinedTextProps {
  text: string;
  fontSize?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export function OutlinedText({
  text,
  fontSize = 16,
  fill = 'white',
  stroke = 'black',
  strokeWidth = 4,
}: OutlinedTextProps) {
  return (
    <svg width='100%' height={fontSize + strokeWidth * 2}>
      <text
        x='0'
        y={fontSize}
        fontSize={fontSize}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        paintOrder='stroke'
        strokeLinejoin='round'
      >
        {text}
      </text>
    </svg>
  );
}
