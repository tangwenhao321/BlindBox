import { getAppLocale } from "../utils/i18nLocale";

export type VietnamRegion = {
  code: string;
  name: string;
  nameVi: string;
};

/** 63 provinces / centrally-controlled municipalities (simplified picker list). */
export const VIETNAM_REGIONS: VietnamRegion[] = [
  { code: "HN", name: "Hanoi", nameVi: "Thành phố Hà Nội" },
  { code: "SG", name: "Ho Chi Minh City", nameVi: "Thành phố Hồ Chí Minh" },
  { code: "DN", name: "Da Nang", nameVi: "Thành phố Đà Nẵng" },
  { code: "HP", name: "Hai Phong", nameVi: "Thành phố Hải Phòng" },
  { code: "CT", name: "Can Tho", nameVi: "Thành phố Cần Thơ" },
  { code: "AG", name: "An Giang", nameVi: "An Giang" },
  { code: "BV", name: "Ba Ria - Vung Tau", nameVi: "Bà Rịa - Vũng Tàu" },
  { code: "BG", name: "Bac Giang", nameVi: "Bắc Giang" },
  { code: "BK", name: "Bac Kan", nameVi: "Bắc Kạn" },
  { code: "BL", name: "Bac Lieu", nameVi: "Bạc Liêu" },
  { code: "BN", name: "Bac Ninh", nameVi: "Bắc Ninh" },
  { code: "BT", name: "Ben Tre", nameVi: "Bến Tre" },
  { code: "BDI", name: "Binh Dinh", nameVi: "Bình Định" },
  { code: "BD", name: "Binh Duong", nameVi: "Bình Dương" },
  { code: "BP", name: "Binh Phuoc", nameVi: "Bình Phước" },
  { code: "BTH", name: "Binh Thuan", nameVi: "Bình Thuận" },
  { code: "CM", name: "Ca Mau", nameVi: "Cà Mau" },
  { code: "CB", name: "Cao Bang", nameVi: "Cao Bằng" },
  { code: "DL", name: "Dak Lak", nameVi: "Đắk Lắk" },
  { code: "DG", name: "Dak Nong", nameVi: "Đắk Nông" },
  { code: "DB", name: "Dien Bien", nameVi: "Điện Biên" },
  { code: "DNI", name: "Dong Nai", nameVi: "Đồng Nai" },
  { code: "DT", name: "Dong Thap", nameVi: "Đồng Tháp" },
  { code: "GL", name: "Gia Lai", nameVi: "Gia Lai" },
  { code: "HG", name: "Ha Giang", nameVi: "Hà Giang" },
  { code: "HNA", name: "Ha Nam", nameVi: "Hà Nam" },
  { code: "HT", name: "Ha Tinh", nameVi: "Hà Tĩnh" },
  { code: "HD", name: "Hai Duong", nameVi: "Hải Dương" },
  { code: "HGI", name: "Hau Giang", nameVi: "Hậu Giang" },
  { code: "HB", name: "Hoa Binh", nameVi: "Hòa Bình" },
  { code: "HY", name: "Hung Yen", nameVi: "Hưng Yên" },
  { code: "KH", name: "Khanh Hoa", nameVi: "Khánh Hòa" },
  { code: "KG", name: "Kien Giang", nameVi: "Kiên Giang" },
  { code: "KT", name: "Kon Tum", nameVi: "Kon Tum" },
  { code: "LC", name: "Lai Chau", nameVi: "Lai Châu" },
  { code: "LD", name: "Lam Dong", nameVi: "Lâm Đồng" },
  { code: "LS", name: "Lang Son", nameVi: "Lạng Sơn" },
  { code: "LCA", name: "Lao Cai", nameVi: "Lào Cai" },
  { code: "LA", name: "Long An", nameVi: "Long An" },
  { code: "ND", name: "Nam Dinh", nameVi: "Nam Định" },
  { code: "NA", name: "Nghe An", nameVi: "Nghệ An" },
  { code: "NB", name: "Ninh Binh", nameVi: "Ninh Bình" },
  { code: "NT", name: "Ninh Thuan", nameVi: "Ninh Thuận" },
  { code: "PT", name: "Phu Tho", nameVi: "Phú Thọ" },
  { code: "PY", name: "Phu Yen", nameVi: "Phú Yên" },
  { code: "QB", name: "Quang Binh", nameVi: "Quảng Bình" },
  { code: "QNM", name: "Quang Nam", nameVi: "Quảng Nam" },
  { code: "QNG", name: "Quang Ngai", nameVi: "Quảng Ngãi" },
  { code: "QN", name: "Quang Ninh", nameVi: "Quảng Ninh" },
  { code: "QT", name: "Quang Tri", nameVi: "Quảng Trị" },
  { code: "ST", name: "Soc Trang", nameVi: "Sóc Trăng" },
  { code: "SL", name: "Son La", nameVi: "Sơn La" },
  { code: "TN", name: "Tay Ninh", nameVi: "Tây Ninh" },
  { code: "TB", name: "Thai Binh", nameVi: "Thái Bình" },
  { code: "TNg", name: "Thai Nguyen", nameVi: "Thái Nguyên" },
  { code: "TH", name: "Thanh Hoa", nameVi: "Thanh Hóa" },
  { code: "TTH", name: "Thua Thien Hue", nameVi: "Thừa Thiên Huế" },
  { code: "TG", name: "Tien Giang", nameVi: "Tiền Giang" },
  { code: "TV", name: "Tra Vinh", nameVi: "Trà Vinh" },
  { code: "TQ", name: "Tuyen Quang", nameVi: "Tuyên Quang" },
  { code: "VL", name: "Vinh Long", nameVi: "Vĩnh Long" },
  { code: "VP", name: "Vinh Phuc", nameVi: "Vĩnh Phúc" },
  { code: "YB", name: "Yen Bai", nameVi: "Yên Bái" },
];

export function getVietnamRegionLabel(region: VietnamRegion, useVi = getAppLocale() === "vi-VN") {
  return useVi ? region.nameVi : region.name;
}

export function getVietnamRegionOptions(useVi = getAppLocale() === "vi-VN") {
  return VIETNAM_REGIONS.map((region) => getVietnamRegionLabel(region, useVi));
}

export function findVietnamRegionByLabel(label: string) {
  const trimmed = label.trim();
  if (!trimmed) return null;
  return (
    VIETNAM_REGIONS.find(
      (region) => region.nameVi === trimmed || region.name === trimmed,
    ) ?? null
  );
}
