import { RouterProvider } from "react-router";
import { router } from "@/router";
import { PwaUpdatePrompt } from "@/components/PwaUpdatePrompt";

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <PwaUpdatePrompt />
    </>
  );
}

export default App;
