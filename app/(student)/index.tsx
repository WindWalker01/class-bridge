import { Redirect } from "expo-router";

import { Routes } from "@/lib/navigation";

export default function StudentIndexRedirect() {
  return <Redirect href={Routes.studentTab} />;
}