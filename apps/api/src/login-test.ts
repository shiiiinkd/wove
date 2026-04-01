import { supabase } from "./lib/supabase.js";

const main = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "shin20040507@icloud.com",
    password: "shin2004",
  });

  if (error) {
    console.error("Login failed:", error.message);
    return;
  }

  console.log("User:", data.user?.id);
  console.log("Access Token:", data.session?.access_token);
};

main();
