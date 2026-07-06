import { resolveOrderStatus } from "../../utils/trackOrder";
import { TimelineItem } from "./TimelineItem";

const STAGES = [
  { key: "ACCEPTED", label: "Accepted" },
  { key: "PREPARING", label: "Preparing" },
  { key: "ON_THE_WAY", label: "On The Way" },
  { key: "DELIVERED", label: "Delivered" },
];

export function OrderTimeline({ tracking, fallbackOrder }) {
  const orderStatus = resolveOrderStatus(tracking, fallbackOrder);
  const currentIndex = STAGES.findIndex((stage) => stage.key === orderStatus);

  return (
    <div className="track-timeline">
      <h4 className="track-timeline-title">Order Progress</h4>
      <div className="track-timeline-row">
        {STAGES.map((stage, index) => {
          let state = "pending";

          if (currentIndex >= 0) {
            if (index < currentIndex) {
              state = "completed";
            } else if (index === currentIndex) {
              state = orderStatus === "DELIVERED" ? "completed" : "active";
            }
          }

          return (
            <TimelineItem
              key={stage.key}
              label={stage.label}
              state={state}
              isLast={index === STAGES.length - 1}
            />
          );
        })}
      </div>
    </div>
  );
}
