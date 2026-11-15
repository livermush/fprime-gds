import {
  H1,
  H2,
  Stack,
  Table,
  Text,
  useHostTheme,
} from "cursor/canvas";

const FLIGHT = [
  {
    title: "APID",
    file: "SpacePacketFramer.cpp",
    role: "11-bit APID into packet identification",
  },
  {
    title: "Sequence count",
    file: "ApidManager.cpp",
    role: "Per-APID count, 14-bit width",
  },
  {
    title: "Framing",
    file: "SpacePacketFramer.cpp",
    role: "Primary header around the payload",
  },
] as const;

const GROUND = [
  {
    title: "Deframing",
    file: "space_packet_splitter.py",
    role: "Byte stream to one whole space packet",
  },
  {
    title: "Sequence count",
    file: "space_packet.py",
    role: "Header removed; count kept per APID",
  },
] as const;

export default function CcsdsFlightGroundBoundary() {
  const theme = useHostTheme();
  const ink = theme.text.primary;
  const muted = theme.text.secondary;
  const faint = theme.text.tertiary;
  const nodeFill = theme.bg.elevated;
  const nodeStroke = theme.stroke.secondary;
  const laneStroke = theme.stroke.tertiary;
  const accent = theme.accent.primary;

  const flightX = 24;
  const flightW = 292;
  const wireX = 340;
  const wireW = 300;
  const groundX = 664;
  const groundW = 332;
  const nodeW = 260;
  const nodeH = 78;
  const flightNodeX = flightX + 16;
  const groundNodeX = groundX + 16;
  const flightYs = [64, 176, 288];
  const groundYs = [288, 400];

  return (
    <Stack gap={20}>
      <Stack gap={6}>
        <H1>CCSDS Flight-Ground Boundary</H1>
        <Text tone="secondary">
          Downlink space packet. Flight frames in fprime/Svc. Ground deframes
          in fprime-gds common/communication. Scope is framing, APID, sequence
          count, and deframing.
        </Text>
      </Stack>

      <svg
        viewBox="0 0 1020 500"
        role="img"
        aria-label="Two lanes, flight framing to ground deframing, with the space packet header contract between them"
        style={{ width: "100%", height: "auto" }}
      >
        <rect
          x={flightX}
          y={40}
          width={flightW}
          height={444}
          rx={8}
          fill={theme.fill.tertiary}
          stroke={laneStroke}
        />
        <rect
          x={wireX}
          y={40}
          width={wireW}
          height={444}
          rx={8}
          fill={theme.bg.editor}
          stroke={accent}
          strokeDasharray="5 4"
        />
        <rect
          x={groundX}
          y={40}
          width={groundW}
          height={444}
          rx={8}
          fill={theme.fill.secondary}
          stroke={laneStroke}
        />

        <text x={flightX + 16} y={28} fill={ink} fontSize={13} fontWeight={590}>
          Flight
        </text>
        <text x={wireX + 16} y={28} fill={accent} fontSize={13} fontWeight={590}>
          Flight–ground boundary
        </text>
        <text x={groundX + 16} y={28} fill={ink} fontSize={13} fontWeight={590}>
          Ground
        </text>

        <text x={flightX + 16} y={56} fill={faint} fontSize={11}>
          fprime/Svc/Ccsds
        </text>
        <text x={groundX + 16} y={56} fill={faint} fontSize={11}>
          communication/ccsds
        </text>

        {FLIGHT.map((node, i) => (
          <g key={node.title}>
            <rect
              x={flightNodeX}
              y={flightYs[i]}
              width={nodeW}
              height={nodeH}
              rx={6}
              fill={nodeFill}
              stroke={nodeStroke}
            />
            <text
              x={flightNodeX + 12}
              y={flightYs[i] + 22}
              fill={ink}
              fontSize={13}
              fontWeight={590}
            >
              {node.title}
            </text>
            <text
              x={flightNodeX + 12}
              y={flightYs[i] + 42}
              fill={accent}
              fontSize={12}
            >
              {node.file}
            </text>
            <text
              x={flightNodeX + 12}
              y={flightYs[i] + 60}
              fill={muted}
              fontSize={11}
            >
              {node.role}
            </text>
          </g>
        ))}

        <DownArrow
          x={flightNodeX + nodeW / 2}
          y1={flightYs[0] + nodeH}
          y2={flightYs[1]}
          color={muted}
        />
        <DownArrow
          x={flightNodeX + nodeW / 2}
          y1={flightYs[1] + nodeH}
          y2={flightYs[2]}
          color={muted}
        />

        <text x={wireX + 16} y={72} fill={ink} fontSize={13} fontWeight={590}>
          Shared wire contract
        </text>
        <text x={wireX + 16} y={92} fill={faint} fontSize={11}>
          Svc/Ccsds/Types/Types.fpp
        </text>

        <ContractLine
          y={124}
          name="packetIdentification"
          detail="PVN 3 · type 1 · sec hdr 1 · APID 11"
          ink={ink}
          muted={muted}
          x={wireX + 16}
        />
        <ContractLine
          y={168}
          name="packetSequenceControl"
          detail="seq flags 2 · sequence count 14"
          ink={ink}
          muted={muted}
          x={wireX + 16}
        />
        <ContractLine
          y={212}
          name="packetDataLength"
          detail="16-bit length"
          ink={ink}
          muted={muted}
          x={wireX + 16}
        />

        <text x={wireX + 16} y={256} fill={muted} fontSize={11}>
          APID mask 0x07FF · width 11
        </text>
        <text x={wireX + 16} y={274} fill={muted} fontSize={11}>
          Sequence count mask 0x3FFF · width 14
        </text>

        <line
          x1={flightNodeX + nodeW}
          y1={flightYs[2] + nodeH / 2}
          x2={groundNodeX - 8}
          y2={groundYs[0] + nodeH / 2}
          stroke={accent}
          strokeWidth={1.75}
        />
        <polygon
          points={`${groundNodeX - 1},${groundYs[0] + nodeH / 2} ${groundNodeX - 9},${groundYs[0] + nodeH / 2 - 4} ${groundNodeX - 9},${groundYs[0] + nodeH / 2 + 4}`}
          fill={accent}
        />
        <text
          x={(flightNodeX + nodeW + groundNodeX) / 2}
          y={flightYs[2] + nodeH / 2 - 10}
          fill={accent}
          fontSize={11}
          textAnchor="middle"
        >
          space packet
        </text>

        {GROUND.map((node, i) => (
          <g key={node.file}>
            <rect
              x={groundNodeX}
              y={groundYs[i]}
              width={nodeW + 28}
              height={nodeH}
              rx={6}
              fill={nodeFill}
              stroke={nodeStroke}
            />
            <text
              x={groundNodeX + 12}
              y={groundYs[i] + 22}
              fill={ink}
              fontSize={13}
              fontWeight={590}
            >
              {node.title}
            </text>
            <text
              x={groundNodeX + 12}
              y={groundYs[i] + 42}
              fill={accent}
              fontSize={12}
            >
              {node.file}
            </text>
            <text
              x={groundNodeX + 12}
              y={groundYs[i] + 60}
              fill={muted}
              fontSize={11}
            >
              {node.role}
            </text>
          </g>
        ))}

        <DownArrow
          x={groundNodeX + (nodeW + 28) / 2}
          y1={groundYs[0] + nodeH}
          y2={groundYs[1]}
          color={muted}
        />

        <text x={groundX + 16} y={78} fill={faint} fontSize={11}>
          Deframe order: chain.py
        </text>
        <text x={groundX + 16} y={96} fill={faint} fontSize={11}>
          splitter, then space packet
        </text>
      </svg>

      <Text size="small" tone="tertiary">
        Source: fprime/Svc/Ccsds and
        fprime-gds/src/fprime_gds/common/communication/ccsds
      </Text>

      <Stack gap={8}>
        <H2>Owning files</H2>
        <Table
          headers={["Lane", "Role", "File"]}
          striped
          rows={[
            [
              "Flight",
              "APID into the header",
              "Svc/Ccsds/SpacePacketFramer/SpacePacketFramer.cpp",
            ],
            [
              "Flight",
              "Sequence count",
              "Svc/Ccsds/ApidManager/ApidManager.cpp",
            ],
            [
              "Flight",
              "Framing",
              "Svc/Ccsds/SpacePacketFramer/SpacePacketFramer.cpp",
            ],
            [
              "Boundary",
              "Header fields",
              "Svc/Ccsds/Types/Types.fpp",
            ],
            [
              "Ground",
              "Deframing",
              "src/fprime_gds/common/communication/ccsds/space_packet_splitter.py",
            ],
            [
              "Ground",
              "Sequence count",
              "src/fprime_gds/common/communication/ccsds/space_packet.py",
            ],
            [
              "Ground",
              "Deframe order",
              "src/fprime_gds/common/communication/ccsds/chain.py",
            ],
          ]}
        />
      </Stack>
    </Stack>
  );
}

function ContractLine({
  x,
  y,
  name,
  detail,
  ink,
  muted,
}: {
  x: number;
  y: number;
  name: string;
  detail: string;
  ink: string;
  muted: string;
}) {
  return (
    <g>
      <text x={x} y={y} fill={ink} fontSize={12} fontWeight={590}>
        {name}
      </text>
      <text x={x} y={y + 16} fill={muted} fontSize={11}>
        {detail}
      </text>
    </g>
  );
}

function DownArrow({
  x,
  y1,
  y2,
  color,
}: {
  x: number;
  y1: number;
  y2: number;
  color: string;
}) {
  return (
    <g>
      <line
        x1={x}
        y1={y1 + 2}
        x2={x}
        y2={y2 - 7}
        stroke={color}
        strokeWidth={1.5}
      />
      <polygon
        points={`${x},${y2 - 1} ${x - 4},${y2 - 8} ${x + 4},${y2 - 8}`}
        fill={color}
      />
    </g>
  );
}
