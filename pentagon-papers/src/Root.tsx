import { Composition } from "remotion";
import { Documentary } from "./Documentary";
import { TOTAL } from "./shots";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PentagonPapers"
      component={Documentary}
      durationInFrames={Math.round(TOTAL * 30)}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
