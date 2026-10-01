interface Props {
  size?: number;
  inverse?: boolean;
}

export default function Logo({ size = 28, inverse = false }: Props) {
  return (
    <>
      <span className={`inline-flex items-center gap-2.5 ${inverse ? 'text-white' : 'text-ink'}`}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          style={{ transform: 'rotate(-90deg)' }}
          aria-hidden="true"
        >
          <path d="M16 3.5 28 10l-12 6.5L4 10z" fill="currentColor"></path>
          <path
            d="m4 15.5 12 6.5 12-6.5M4 21.5 16 28l12-6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          ></path>
        </svg>
        <span className="whitespace-nowrap text-base font-semibold leading-none tracking-[-0.035em] min-[381px]:text-lg">
          Reforma Digital
        </span>
      </span>
    </>
  );
}
