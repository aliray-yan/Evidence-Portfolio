import { useState } from "react";

const VLANS = [
  {
    id: 10, dept: "IT", hosts: 5,
    subnet: "192.168.10.0/27", gateway: "192.168.10.1",
    range: "192.168.10.1 – .30", broadcast: "192.168.10.31",
    color: "#00d4ff", dark: "#003d4d", hostIPs: ["192.168.10.2","192.168.10.3","192.168.10.4","192.168.10.5","192.168.10.6"],
    mask: "255.255.255.224", port: "Fa0/1"
  },
  {
    id: 20, dept: "HR", hosts: 5,
    subnet: "192.168.10.32/27", gateway: "192.168.10.33",
    range: "192.168.10.33 – .62", broadcast: "192.168.10.63",
    color: "#00ff9d", dark: "#003d25", hostIPs: ["192.168.10.34","192.168.10.35","192.168.10.36","192.168.10.37","192.168.10.38"],
    mask: "255.255.255.224", port: "Fa0/2"
  },
  {
    id: 30, dept: "Web-Servers", hosts: 3,
    subnet: "192.168.10.64/28", gateway: "192.168.10.65",
    range: "192.168.10.65 – .78", broadcast: "192.168.10.79",
    color: "#ff6b35", dark: "#4d1f00", hostIPs: ["192.168.10.66","192.168.10.67","192.168.10.68"],
    mask: "255.255.255.240", port: "Fa0/3"
  }
];

const steps = [
  {
    phase: "1. Add Devices",
    icon: "🖥️",
    items: [
      "Open Cisco Packet Tracer",
      "Add 1x Layer 3 Switch (e.g. 3560) or Router + Layer 2 Switch",
      "Add 13 PCs total (5 for IT, 5 for HR, 3 for Web-Servers)",
      "Arrange devices by department for clarity",
      "Connect PCs to the switch using straight-through cables (Copper Straight-Through)"
    ]
  },
  {
    phase: "2. Configure VLANs on Switch",
    icon: "🔧",
    items: [
      "Click the switch → CLI tab",
      "enable\nconfigure terminal",
      "vlan 10\n name IT\nvlan 20\n name HR\nvlan 30\n name Web-Servers\nexit",
      "Verify with: show vlan brief"
    ]
  },
  {
    phase: "3. Assign Access Ports",
    icon: "🔌",
    items: [
      "For IT PCs (Fa0/1 – Fa0/5):\ninterface range fa0/1-5\nswitchport mode access\nswitchport access vlan 10",
      "For HR PCs (Fa0/6 – Fa0/10):\ninterface range fa0/6-10\nswitchport mode access\nswitchport access vlan 20",
      "For Web-Server PCs (Fa0/11 – Fa0/13):\ninterface range fa0/11-13\nswitchport mode access\nswitchport access vlan 30"
    ]
  },
  {
    phase: "4. Configure SVI (Layer 3 Switch)",
    icon: "🌐",
    items: [
      "ip routing",
      "interface vlan 10\n ip address 192.168.10.1 255.255.255.224\n no shutdown",
      "interface vlan 20\n ip address 192.168.10.33 255.255.255.224\n no shutdown",
      "interface vlan 30\n ip address 192.168.10.65 255.255.255.240\n no shutdown",
      "end\nwrite memory"
    ]
  },
  {
    phase: "5. Configure PCs",
    icon: "💻",
    items: [
      "Click each PC → Desktop → IP Configuration",
      "IT PC1: IP 192.168.10.2 | Mask 255.255.255.224 | GW 192.168.10.1",
      "HR PC1: IP 192.168.10.34 | Mask 255.255.255.224 | GW 192.168.10.33",
      "Web PC1: IP 192.168.10.66 | Mask 255.255.255.240 | GW 192.168.10.65",
      "Assign sequential IPs to remaining PCs in each VLAN"
    ]
  },
  {
    phase: "6. Verify Connectivity",
    icon: "✅",
    items: [
      "PC → Desktop → Command Prompt",
      "Same VLAN test:\nping 192.168.10.2 (from another IT PC) → should succeed",
      "Cross-VLAN test:\nping 192.168.10.34 (from IT to HR) → should succeed via L3 switch",
      "Use 'show ip route' on switch to confirm routes",
      "Use Packet Tracer simulation mode to trace packets"
    ]
  }
];

export default function App() {
  const [activeStep, setActiveStep] = useState(null);
  const [activeVlan, setActiveVlan] = useState(null);

  return (
    <div style={{
      background: "#0a0e1a",
      minHeight: "100vh",
      fontFamily: "'Courier New', monospace",
      color: "#e0e8ff",
      padding: "24px",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: 8, color: "#444", marginBottom: 8 }}>CISCO PACKET TRACER</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: 2, color: "#fff" }}>
          VLAN NETWORK DESIGN
        </h1>
        <div style={{ fontSize: 11, color: "#555", marginTop: 6, letterSpacing: 4 }}>3 VLANs · 13 HOSTS · INTER-VLAN ROUTING</div>
      </div>

      {/* Network Diagram */}
      <div style={{
        background: "#0d1224",
        border: "1px solid #1e2a4a",
        borderRadius: 12,
        padding: 24,
        marginBottom: 28
      }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#445", marginBottom: 20, textAlign: "center" }}>TOPOLOGY DIAGRAM</div>

        {/* Internet/Cloud at top */}
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{
            display: "inline-block",
            background: "#111827",
            border: "1px dashed #334",
            borderRadius: 8,
            padding: "8px 20px",
            fontSize: 13,
            color: "#556"
          }}>☁️ Internet / Uplink (optional)</div>
        </div>

        {/* Trunk line to router */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ width: 2, height: 30, background: "#334" }}></div>
        </div>

        {/* Core Switch */}
        <div style={{ textAlign: "center", marginBottom: 0 }}>
          <div style={{
            display: "inline-block",
            background: "linear-gradient(135deg, #1a2040, #0d1530)",
            border: "2px solid #2244aa",
            borderRadius: 10,
            padding: "12px 32px",
            fontSize: 14,
            fontWeight: 700,
            color: "#6699ff",
            letterSpacing: 1,
            boxShadow: "0 0 20px #1122aa44"
          }}>
            ⬡ LAYER 3 SWITCH (Cisco 3560)
            <div style={{ fontSize: 10, color: "#445", marginTop: 3, fontWeight: 400 }}>ip routing enabled</div>
          </div>
        </div>

        {/* Three trunk lines down */}
        <div style={{ display: "flex", justifyContent: "center", gap: 0, marginTop: 0 }}>
          {VLANS.map((v, i) => (
            <div key={v.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 2, height: 28, background: v.color + "66" }}></div>
              <div style={{
                fontSize: 9,
                color: v.color,
                background: v.dark + "cc",
                border: `1px solid ${v.color}44`,
                borderRadius: 4,
                padding: "2px 6px",
                marginBottom: 4
              }}>{v.port} — Trunk</div>

              {/* VLAN Box */}
              <div
                onClick={() => setActiveVlan(activeVlan === v.id ? null : v.id)}
                style={{
                  cursor: "pointer",
                  background: `linear-gradient(135deg, ${v.dark}cc, #0a0e1a)`,
                  border: `2px solid ${activeVlan === v.id ? v.color : v.color + "55"}`,
                  borderRadius: 10,
                  padding: "14px 10px",
                  width: "90%",
                  boxShadow: activeVlan === v.id ? `0 0 24px ${v.color}44` : "none",
                  transition: "all 0.2s",
                  textAlign: "center"
                }}
              >
                <div style={{ fontSize: 10, color: v.color, letterSpacing: 3, marginBottom: 4 }}>VLAN {v.id}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{v.dept}</div>
                <div style={{ fontSize: 9, color: "#aaa", marginBottom: 2 }}>{v.subnet}</div>
                <div style={{ fontSize: 9, color: "#777" }}>GW: {v.gateway}</div>
                <div style={{ fontSize: 9, color: "#555", marginTop: 4 }}>Mask: {v.mask}</div>

                {activeVlan === v.id && (
                  <div style={{ marginTop: 10, borderTop: `1px solid ${v.color}33`, paddingTop: 8 }}>
                    <div style={{ fontSize: 9, color: v.color, marginBottom: 4 }}>HOST IPs</div>
                    {v.hostIPs.map(ip => (
                      <div key={ip} style={{ fontSize: 9, color: "#ccc", padding: "1px 0" }}>💻 {ip}</div>
                    ))}
                    <div style={{ fontSize: 9, color: "#444", marginTop: 4 }}>Broadcast: {v.broadcast}</div>
                  </div>
                )}
              </div>

              {/* Access line + PCs */}
              <div style={{ width: 2, height: 16, background: v.color + "44" }}></div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", maxWidth: 120 }}>
                {Array.from({ length: v.hosts }).map((_, j) => (
                  <div key={j} style={{
                    width: 22, height: 18,
                    background: v.dark + "dd",
                    border: `1px solid ${v.color}44`,
                    borderRadius: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10
                  }}>🖥</div>
                ))}
              </div>
              <div style={{ fontSize: 9, color: "#445", marginTop: 4 }}>{v.hosts} host{v.hosts > 1 ? "s" : ""}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 10, color: "#334" }}>
          ↑ Click a VLAN box to expand host IP details
        </div>
      </div>

      {/* Subnet Summary Table */}
      <div style={{
        background: "#0d1224",
        border: "1px solid #1e2a4a",
        borderRadius: 12,
        padding: 20,
        marginBottom: 28,
        overflowX: "auto"
      }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#445", marginBottom: 16 }}>SUBNET REFERENCE</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1e2a4a" }}>
              {["VLAN","Dept","Subnet","Mask","Gateway","Range","Broadcast","Hosts"].map(h => (
                <th key={h} style={{ padding: "6px 10px", color: "#445", textAlign: "left", letterSpacing: 2 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VLANS.map(v => (
              <tr key={v.id} style={{ borderBottom: "1px solid #111827" }}>
                <td style={{ padding: "8px 10px", color: v.color, fontWeight: 700 }}>{v.id}</td>
                <td style={{ padding: "8px 10px", color: "#ccc" }}>{v.dept}</td>
                <td style={{ padding: "8px 10px", color: "#aaa" }}>{v.subnet}</td>
                <td style={{ padding: "8px 10px", color: "#888" }}>{v.mask}</td>
                <td style={{ padding: "8px 10px", color: v.color + "cc" }}>{v.gateway}</td>
                <td style={{ padding: "8px 10px", color: "#777" }}>{v.range}</td>
                <td style={{ padding: "8px 10px", color: "#555" }}>{v.broadcast}</td>
                <td style={{ padding: "8px 10px", color: "#aaa" }}>{v.hosts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Step by Step */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#445", marginBottom: 16 }}>CONFIGURATION STEPS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {steps.map((s, i) => (
            <div
              key={i}
              onClick={() => setActiveStep(activeStep === i ? null : i)}
              style={{
                background: activeStep === i ? "#0d1530" : "#0d1224",
                border: `1px solid ${activeStep === i ? "#2244aa" : "#1e2a4a"}`,
                borderRadius: 10,
                cursor: "pointer",
                overflow: "hidden",
                transition: "all 0.2s"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 1, color: activeStep === i ? "#6699ff" : "#aaa" }}>
                  {s.phase}
                </span>
                <span style={{ marginLeft: "auto", color: "#334", fontSize: 12 }}>{activeStep === i ? "▲" : "▼"}</span>
              </div>
              {activeStep === i && (
                <div style={{ padding: "0 18px 16px 50px", borderTop: "1px solid #1a2040" }}>
                  {s.items.map((item, j) => (
                    <div key={j} style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 11, color: "#778" }}>Step {j + 1}</div>
                      <pre style={{
                        margin: "4px 0 0",
                        fontFamily: "'Courier New', monospace",
                        fontSize: 11,
                        color: "#cde",
                        background: "#080c16",
                        border: "1px solid #1a2040",
                        borderRadius: 6,
                        padding: "8px 12px",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word"
                      }}>{item}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Full CLI Reference */}
      <div style={{
        background: "#080c16",
        border: "1px solid #1e2a4a",
        borderRadius: 12,
        padding: 20,
        marginBottom: 16
      }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#445", marginBottom: 14 }}>COMPLETE CLI REFERENCE (L3 SWITCH)</div>
        <pre style={{ fontSize: 10, color: "#6699ff", lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0 }}>{`enable
configure terminal

! --- Create VLANs ---
vlan 10
 name IT
vlan 20
 name HR
vlan 30
 name Web-Servers
exit

! --- Assign Access Ports ---
interface range fa0/1-5
 switchport mode access
 switchport access vlan 10
 exit
interface range fa0/6-10
 switchport mode access
 switchport access vlan 20
 exit
interface range fa0/11-13
 switchport mode access
 switchport access vlan 30
 exit

! --- Enable Routing & Configure SVIs ---
ip routing

interface vlan 10
 ip address 192.168.10.1 255.255.255.224
 no shutdown
 exit
interface vlan 20
 ip address 192.168.10.33 255.255.255.224
 no shutdown
 exit
interface vlan 30
 ip address 192.168.10.65 255.255.255.240
 no shutdown
 exit

end
write memory`}</pre>
      </div>

      <div style={{ textAlign: "center", fontSize: 10, color: "#334", letterSpacing: 2 }}>
        INTER-VLAN ROUTING ENABLED · LAYER 3 SWITCH · 3 VLANS · 13 HOSTS
      </div>
    </div>
  );
}
