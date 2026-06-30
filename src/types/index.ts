export type AdminTab = "dashboard" | "restaurants" | "livreurs" | "commandes" | "finances" | "securite";

export interface BfRestaurant {
  id: string; owner_id: string; name: string;
  location: string; phone: string | null; created_at: string;
}
export interface BfProfile {
  id: string; name: string; phone: string;
  role: "Client" | "Gérant" | "Livreur" | "Admin"; created_at?: string;
}
export interface BfOrder {
  id: string; client_id: string; restaurant_id: string;
  delivery_person_id: string | null;
  status: "pending"|"accepted"|"scanned"|"arrived"|"delivered"|"cancelled";
  total_amount: number; restaurant_amount: number;
  delivery_amount: number; commission_amount: number;
  delivery_landmark: string | null; created_at: string;
}
export interface BfPayoutRequest {
  id: string; user_id: string; amount: number;
  momo_number: string; status: "en_cours"|"valide"|"rejete";
  requested_at: string; processed_at: string | null;
}
export interface BfMenuItem {
  id: number; restaurant_id: string; dish_name: string;
  price: number; description: string | null;
  is_available: boolean; image_url: string | null; created_at: string;
}
export interface StatCard { label: string; value: string; sub?: string; trend?: "up"|"down"|"neutral"; color: string; }
