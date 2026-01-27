import { redirect } from "next/navigation";

export default function Home() {
  // App root redirects to login
  redirect("/login");
}
