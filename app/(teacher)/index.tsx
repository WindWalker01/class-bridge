import { Redirect } from "expo-router";

import { Routes } from "@/lib/navigation";

export default function TeacherIndexRedirect() {
  return <Redirect href={Routes.teacherTab} />;
}
