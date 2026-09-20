// Curated choices, not an exhaustive accreditation directory. Other schools are welcome.
export const universities = [
  {
    name: "Монгол Улсын Их Сургууль",
    short: "МУИС",
    url: "https://num.edu.mn",
  },
  {
    name: "Шинжлэх Ухаан, Технологийн Их Сургууль",
    short: "ШУТИС",
    url: "https://must.edu.mn",
  },
  {
    name: "Монгол Улсын Боловсролын Их Сургууль",
    short: "МУБИС",
    url: "https://msue.edu.mn",
  },
  {
    name: "Анагаахын Шинжлэх Ухааны Үндэсний Их Сургууль",
    short: "АШУҮИС",
    url: "https://mnums.edu.mn",
  },
  {
    name: "Хөдөө Аж Ахуйн Их Сургууль",
    short: "ХААИС",
    url: "https://muls.edu.mn",
  },
  {
    name: "Санхүү Эдийн Засгийн Их Сургууль",
    short: "СЭЗИС",
    url: "https://ufe.edu.mn",
  },
  {
    name: "Олон Улсын Улаанбаатарын Их Сургууль",
    short: "ОУУБИС",
    url: "https://iuu.edu.mn",
  },
  {
    name: "Монгол-Германы хамтарсан ашигт малтмал технологийн их сургууль",
    short: "МГТИС",
    url: "https://gmit.edu.mn",
  },
] as const;
export type StudentProfile = {
  display_name: string;
  university: string;
  major: string;
  study_year: string;
};
export function profileError(p: StudentProfile) {
  if (!p.display_name.trim() || p.display_name.trim().length > 80)
    return "Enter your name (up to 80 characters).";
  if (!p.university.trim() || p.university.trim().length > 160)
    return "Choose or enter your university (up to 160 characters).";
  if (!p.major.trim() || p.major.trim().length > 120)
    return "Enter your major (up to 120 characters).";
  return "";
}
