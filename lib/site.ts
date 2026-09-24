// Yayına almadan önce ortam değişkenleriyle doldurulacak site bilgileri.
export const site = {
  name: "Arkipel",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  // KVKK kapsamında veri sorumlusu (kişi ya da şirket unvanı) ve başvuru adresi.
  controller: process.env.NEXT_PUBLIC_DATA_CONTROLLER ?? "",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
};
