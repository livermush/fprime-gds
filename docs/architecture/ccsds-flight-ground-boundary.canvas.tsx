import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Grid,
  H1,
  H2,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  useHostTheme,
  useState,
} from "cursor/canvas";

// Architecture explainer for the CCSDS downlink boundary between flight (fprime) and ground (fprime-gds).
// The simulator models observed behavior of both sides so new engineers can see how sequence counting works.

const MAX = 16384; // 2^14: flight SeqCountWidth = 14 (Svc/Ccsds/Types/Types.fpp)
const LAST = MAX - 1; // 16383, the highest 14-bit sequence count

type Kind = "ok" | "gap" | "invalid" | "dropped" | "set";
type Entry = { n: number; kind: Kind; source: string; event: string };
type Sim = { flightNext: number; groundExpects: number; log: Entry[]; n: number };

const START: Sim = { flightNext: 16379, groundExpects: 16379, log: [], n: 0 };

// Flight: per-APID counter (Svc/Ccsds/ApidManager).
function flightEmit(s: Sim): [number, number] {
  const seq = s.flightNext;
  return [seq, (seq + 1) % MAX];
}

// Ground: models the current behavior of deframe() in space_packet.py.
function groundReceive(expects: number, seq: number): { next: number; warn: boolean; expected: number } {
  const expected = expects;
  let next = (expected + 1) % MAX;
  const warn = seq !== expected;
  if (warn) next = seq + 1;
  return { next, warn, expected };
}

function push(s: Sim, e: Omit<Entry, "n">): Sim {
  return { ...s, n: s.n + 1, log: [{ ...e, n: s.n + 1 }, ...s.log].slice(0, 12) };
}

function send(s: Sim): Sim {
  const [seq, flightNext] = flightEmit(s);
  const r = groundReceive(s.groundExpects, seq);
  const t = { ...s, flightNext, groundExpects: r.next };
  if (!r.warn) {
    return push(t, { kind: "ok", source: "Ground", event: `Received ${seq}, expected ${r.expected}. In sequence.` });
  }
  if (r.expected >= MAX) {
    return push(t, {
      kind: "invalid",
      source: "Ground",
      event: `WARNING received ${seq} (expected: ${r.expected}). ${r.expected} is outside the 14-bit range 0-${LAST}: false alarm.`,
    });
  }
  return push(t, {
    kind: "gap",
    source: "Ground",
    event: `WARNING received ${seq} (expected: ${r.expected}). Valid gap warning: a packet was lost.`,
  });
}

function drop(s: Sim): Sim {
  const [seq, flightNext] = flightEmit(s);
  return push({ ...s, flightNext }, {
    kind: "dropped",
    source: "Downlink",
    event: `Packet ${seq} lost in transit. Flight continues with ${flightNext}.`,
  });
}

function setBoth(s: Sim, to: number): Sim {
  return push({ ...s, flightNext: to, groundExpects: to }, {
    kind: "set",
    source: "Simulator",
    event: `Flight and ground synchronized at ${to}.`,
  });
}

// Guided replay of the scenario in the ticket.
const TOUR: { say: string; act: (s: Sim) => Sim }[] = [
  { say: "Synchronize flight and ground at 16381, two packets before the counter limit.", act: (s) => setBoth(s, 16381) },
  { say: "Flight sends 16381. Ground expected it.", act: send },
  { say: "Packet 16382 is lost on the downlink.", act: drop },
  { say: "Flight sends 16383, the highest 14-bit value. Ground correctly warns about the gap.", act: send },
  { say: "Flight's counter rolls over to 0, as defined in Types.fpp. Compare what ground expects.", act: send },
  { say: "Flight sends 1. Ground is back in sequence, which is why the issue is easy to miss.", act: send },
];

export default function CcsdsFlightGroundBoundary() {
  const theme = useHostTheme();
  const [sim, setSim] = useState<Sim>(START);
  const [step, setStep] = useState(0);
  const [target, setTarget] = useState(16379);

  const ink = theme.text.primary;
  const muted = theme.text.secondary;
  const accent = theme.accent.primary;
  const red = theme.category.red;
  const green = theme.category.green;
  const outOfRange = sim.groundExpects >= MAX;
  const last = sim.log[0];

  const nextStep = () => {
    if (step >= TOUR.length) return;
    setSim((s) => TOUR[step].act(s));
    setStep(step + 1);
  };
  const reset = () => {
    setSim(START);
    setStep(0);
  };

  return (
    <Stack gap={20} style={{ padding: 24, maxWidth: 1080 }}>
      <Stack gap={6}>
        <H1>CCSDS Flight/Ground Boundary: packet sequence counting</H1>
        <Text tone="secondary">
          How flight (fprime/Svc/Ccsds) stamps each downlink space packet with a sequence count, and how ground
          (fprime-gds common/communication/ccsds) checks that count to detect lost packets.
        </Text>
      </Stack>

      <Callout tone="info" title="Key concept">
        Each packet carries a 14-bit sequence count. Like an odometer, it counts 0, 1, 2 ... 16383 and then rolls
        over to 0. Valid values are 0 to 16383; 16384 can never appear on the wire.
      </Callout>

      <svg viewBox="0 0 1020 210" role="img" aria-label="Flight sends numbered packets over the downlink to ground" style={{ width: "100%", height: "auto" }}>
        <rect x={10} y={20} width={280} height={170} rx={8} fill={theme.fill.tertiary} stroke={theme.stroke.tertiary} />
        <text x={28} y={48} fill={ink} fontSize={14} fontWeight={590}>Flight</text>
        <text x={28} y={68} fill={muted} fontSize={11}>fprime Svc/Ccsds/ApidManager (C++)</text>
        <rect x={60} y={88} width={180} height={50} rx={6} fill={theme.bg.editor} stroke={accent} strokeWidth={2} />
        <text x={150} y={122} fill={accent} fontSize={26} fontWeight={700} textAnchor="middle">{String(sim.flightNext).padStart(5, "0")}</text>
        <text x={150} y={162} fill={muted} fontSize={11} textAnchor="middle">next count flight will send</text>

        <text x={510} y={70} fill={ink} fontSize={13} fontWeight={590} textAnchor="middle">Downlink</text>
        <text x={510} y={88} fill={muted} fontSize={11} textAnchor="middle">space packets, each with APID + sequence count</text>
        <line x1={300} y1={113} x2={720} y2={113} stroke={theme.stroke.secondary} strokeWidth={2} strokeDasharray="6 6" />
        <polygon points="720,113 710,107 710,119" fill={theme.stroke.secondary} />
        {[0, 1, 2, 3].map((i) => {
          const lost = i === 2 && last?.kind === "dropped";
          return (
            <g key={i}>
              <rect x={330 + i * 95} y={102} width={34} height={22} rx={4} fill={lost ? "none" : theme.fill.primary} stroke={lost ? red : muted} strokeDasharray={lost ? "3 3" : undefined} />
              {lost && <text x={347 + i * 95} y={145} fill={red} fontSize={11} textAnchor="middle">lost</text>}
            </g>
          );
        })}

        <rect x={730} y={20} width={280} height={170} rx={8} fill={theme.fill.secondary} stroke={outOfRange ? red : theme.stroke.tertiary} strokeWidth={outOfRange ? 2 : 1} />
        <text x={748} y={48} fill={ink} fontSize={14} fontWeight={590}>Ground</text>
        <text x={748} y={68} fill={muted} fontSize={11}>fprime-gds space_packet.py deframe()</text>
        <rect x={780} y={88} width={180} height={50} rx={6} fill={theme.bg.editor} stroke={outOfRange ? red : green} strokeWidth={2} />
        <text x={870} y={122} fill={outOfRange ? red : green} fontSize={26} fontWeight={700} textAnchor="middle">{String(sim.groundExpects).padStart(5, "0")}</text>
        <text x={870} y={162} fill={outOfRange ? red : muted} fontSize={11} textAnchor="middle">{outOfRange ? "expected count is outside 0-16383" : "count ground expects next"}</text>
      </svg>

      <Grid columns={3} gap={12}>
        <Stat value={sim.flightNext} label="Flight sends next" />
        <Stat value={sim.groundExpects} label="Ground expects next" tone={outOfRange ? "danger" : "success"} />
        <Stat value={sim.log.filter((e) => e.kind === "invalid").length} label="False alarms (impossible count)" tone="warning" />
      </Grid>

      <Card>
        <CardHeader>Guided replay ({Math.min(step, TOUR.length)}/{TOUR.length})</CardHeader>
        <CardBody>
          <Stack gap={10}>
            <Text>{step < TOUR.length ? `Next: ${TOUR[step].say}` : "Replay complete. Ground raised a warning that expected 16384, a value the 14-bit field cannot hold. Reset, or explore below."}</Text>
            <Row gap={8} wrap>
              <Button variant="primary" onClick={nextStep} disabled={step >= TOUR.length}>Next step</Button>
              <Button variant="secondary" onClick={reset}>Reset</Button>
            </Row>
          </Stack>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>Explore</CardHeader>
        <CardBody>
          <Stack gap={10}>
            <Row gap={8} wrap>
              <Button variant="primary" onClick={() => setSim(send)}>Send packet</Button>
              <Button variant="secondary" onClick={() => setSim(drop)}>Drop packet</Button>
              <Button variant="ghost" onClick={() => setSim((s) => setBoth(s, target))}>Synchronize at {target}</Button>
            </Row>
            <Row gap={8} align="center">
              <Text size="small" tone="secondary">Start count</Text>
              <input type="range" min={0} max={LAST} value={target} onChange={(e) => setTarget(Number(e.target.value))} style={{ flex: 1 }} />
              <Text size="small" weight="semibold">{target}</Text>
            </Row>
            <Text size="small" tone="tertiary">Try: synchronize at 16380, then send, drop, send, send. Compare with a drop far from 16383.</Text>
          </Stack>
        </CardBody>
      </Card>

      <Stack gap={8}>
        <H2>Event log</H2>
        <Table
          headers={["#", "Source", "Event"]}
          rows={sim.log.map((e) => [String(e.n), e.source, e.event])}
          rowTone={sim.log.map((e) => (e.kind === "invalid" ? "danger" : e.kind === "gap" ? "warning" : e.kind === "dropped" ? "info" : "neutral"))}
          emptyMessage="No events yet. Press Next step or Send packet."
        />
      </Stack>

      <Stack gap={8}>
        <H2>File ownership</H2>
        <Table
          headers={["Side", "Role", "File"]}
          striped
          rows={[
            ["Flight (read-only reference)", "14-bit count width", "fprime/Svc/Ccsds/Types/Types.fpp  (SeqCountWidth = 14)"],
            ["Flight (read-only reference)", "Per-APID counter and rollover", "fprime/Svc/Ccsds/ApidManager/ApidManager.cpp  (calculateNextSeqCount)"],
            ["Flight", "APID and count in the packet header", "fprime/Svc/Ccsds/SpacePacketFramer/SpacePacketFramer.cpp"],
            ["Ground", "Byte stream to whole packets", "src/fprime_gds/common/communication/ccsds/space_packet_splitter.py"],
            ["Ground", "Sequence count check and gap warning", "src/fprime_gds/common/communication/ccsds/space_packet.py  (deframe)"],
            ["Ground", "Deframe order", "src/fprime_gds/common/communication/ccsds/chain.py"],
          ]}
        />
        <Text size="small" tone="tertiary">
          Flight is the source of truth for the wire contract. Any ground/flight disagreement is resolved in ground, with
          a regression test.
        </Text>
      </Stack>
    </Stack>
  );
}
