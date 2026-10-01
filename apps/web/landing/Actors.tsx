import { UserRound, BriefcaseBusiness, Landmark } from 'lucide-react';
interface Item {
  icon: 'person' | 'company' | 'state';
  title: string;
  text: string;
}

interface Props {
  items: Item[];
}

const icons = { person: UserRound, company: BriefcaseBusiness, state: Landmark };

export default function Actors({ items }: Props) {
  return (
    <>
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 min-[721px]:grid-cols-3">
        {items.map((item) => {
          const Icon = icons[item.icon];
          return (
            <li key={item.title} className="rounded-card border-0 bg-[#f7f7f7] px-5 py-[22px]">
              <span
                className="grid size-11 place-items-center rounded-full bg-canvas text-brand-900"
                aria-hidden="true"
              >
                <Icon size={22} strokeWidth={1.65} />
              </span>
              <p className="mt-4 font-serif text-2xl leading-[1.1] text-ink">{item.title}</p>
              <p className="mt-2 text-[15px] leading-[1.55] text-ink-muted">{item.text}</p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
