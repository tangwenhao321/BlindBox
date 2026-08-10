export type SolarTermId =
  | "lichun"
  | "yushui"
  | "jingzhe"
  | "chunfen"
  | "qingming"
  | "guyu"
  | "lixia"
  | "xiaoman"
  | "mangzhong"
  | "xiazhi"
  | "xiaoshu"
  | "dashu"
  | "liqiu"
  | "chushu"
  | "bailu"
  | "qiufen"
  | "hanlu"
  | "shuangjiang"
  | "lidong"
  | "xiaoxue"
  | "daxue"
  | "dongzhi"
  | "xiaohan"
  | "dahan";

type SolarTermWindow = { id: SolarTermId; month: number; day: number };

const SOLAR_TERMS: SolarTermWindow[] = [
  { id: "xiaohan", month: 1, day: 6 },
  { id: "dahan", month: 1, day: 20 },
  { id: "lichun", month: 2, day: 4 },
  { id: "yushui", month: 2, day: 19 },
  { id: "jingzhe", month: 3, day: 6 },
  { id: "chunfen", month: 3, day: 21 },
  { id: "qingming", month: 4, day: 5 },
  { id: "guyu", month: 4, day: 20 },
  { id: "lixia", month: 5, day: 6 },
  { id: "xiaoman", month: 5, day: 21 },
  { id: "mangzhong", month: 6, day: 6 },
  { id: "xiazhi", month: 6, day: 21 },
  { id: "xiaoshu", month: 7, day: 7 },
  { id: "dashu", month: 7, day: 23 },
  { id: "liqiu", month: 8, day: 8 },
  { id: "chushu", month: 8, day: 23 },
  { id: "bailu", month: 9, day: 8 },
  { id: "qiufen", month: 9, day: 23 },
  { id: "hanlu", month: 10, day: 8 },
  { id: "shuangjiang", month: 10, day: 23 },
  { id: "lidong", month: 11, day: 7 },
  { id: "xiaoxue", month: 11, day: 22 },
  { id: "daxue", month: 12, day: 7 },
  { id: "dongzhi", month: 12, day: 22 },
];

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

function termDayOfYear(term: SolarTermWindow): number {
  return dayOfYear(new Date(2024, term.month - 1, term.day));
}

export function resolveSolarTermId(date = new Date()): SolarTermId {
  const today = dayOfYear(date);
  let current = SOLAR_TERMS[SOLAR_TERMS.length - 1].id;
  for (const term of SOLAR_TERMS) {
    if (today >= termDayOfYear(term)) current = term.id;
  }
  return current;
}
