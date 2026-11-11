import { ConnectBody } from "./page-bodies/connect";
import { FixBody } from "./page-bodies/fix";
import { SellBody } from "./page-bodies/sell";
import { SimulateBody } from "./page-bodies/simulate";
import { TrackBody } from "./page-bodies/track";

export const pageBodies = {
  connect: ConnectBody,
  simulate: SimulateBody,
  fix: FixBody,
  sell: SellBody,
  track: TrackBody,
};
