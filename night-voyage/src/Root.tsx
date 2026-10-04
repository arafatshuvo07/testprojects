import { Composition } from "remotion";
import { NightVoyage } from "./NightVoyage/NightVoyage";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="NightVoyage"
        component={NightVoyage}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          location: "AEGEAN SEA",
          timestamp: "02:47  LOCAL TIME",
        }}
      />
    </>
  );
};
