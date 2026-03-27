"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

function CustomTooltip({ active, payload, label, team1Name, team2Name }) {
  if (active && payload && payload.length) {
    return (
      <div className="surface" style={{ padding: "12px", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--surface)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 1000}}>
        <p className="kicker" style={{ marginBottom: "8px" }}>End of Over {label}</p>
        {payload.map((entry) => (
          <div key={entry.name} style={{ color: entry.color, fontWeight: "600", marginBottom: "4px" }}>
            {entry.name === "team1" ? team1Name : team2Name}: {entry.value} runs
          </div>
        ))}
        
        {/* Wicket alerts logic if present */}
        {payload[0]?.payload?.wickets?.length > 0 && (
          <div style={{ marginTop: "8px", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
            {payload[0].payload.wickets.map((w, i) => (
              <div key={i} style={{ fontSize: "0.8em", color: "var(--ink-soft)" }}>
                Wicket: {w.player?.name || "Unknown"} ({w.innings === "team1" ? team1Name : team2Name})
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

const CustomizedDot = (props) => {
  const { cx, cy, payload, dataKey } = props;
  if (!payload || !payload.wickets) return null;

  const teamWickets = payload.wickets.filter((w) => w.innings === dataKey);
  
  if (teamWickets.length > 0) {
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={5} 
        fill="var(--surface)" 
        stroke={dataKey === "team1" ? "#3b82f6" : "#64748b"} 
        strokeWidth={2} 
      />
    );
  }
  return null;
};

export function MatchWormChart({ deliveries, innings }) {
  const { chartData, team1Name, team2Name } = useMemo(() => {
    if (!deliveries || !innings) return { chartData: [], team1Name: "Team 1", team2Name: "Team 2" };

    const t1Name = innings.find((i) => i.inningsNumber === 1)?.battingTeam?.name || "Team 1";
    const t2Name = innings.find((i) => i.inningsNumber === 2)?.battingTeam?.name || "Team 2";

    const data = Array.from({ length: 21 }, (_, index) => ({
      over: index,
      team1: index === 0 ? 0 : null,
      team2: index === 0 ? 0 : null,
      wickets: []
    }));

    let team1Score = 0;
    let team2Score = 0;
    let lastTeam1Over = 0;
    let lastTeam2Over = 0;

    for (const delivery of deliveries) {
      const isTeam1 = delivery.inningsNumber === 1;
      const isTeam2 = delivery.inningsNumber === 2;
      const overIndex = Math.floor(Number(delivery.ball)) + 1;
      
      if (overIndex > 20) continue;

      if (isTeam1) {
        team1Score += delivery.totalRuns;
        data[overIndex].team1 = team1Score;
        lastTeam1Over = Math.max(lastTeam1Over, overIndex);
        if (delivery.wicketCount > 0) {
          data[overIndex].wickets.push({ innings: "team1", over: overIndex, score: team1Score, player: delivery.striker });
        }
      }

      if (isTeam2) {
        team2Score += delivery.totalRuns;
        data[overIndex].team2 = team2Score;
        lastTeam2Over = Math.max(lastTeam2Over, overIndex);
        if (delivery.wicketCount > 0) {
          data[overIndex].wickets.push({ innings: "team2", over: overIndex, score: team2Score, player: delivery.striker });
        }
      }
    }

    // Fill gaps for overs without action or maidens properly parsed
    for (let i = 1; i <= lastTeam1Over; i++) {
        if (data[i].team1 === null) data[i].team1 = data[i - 1].team1;
    }
    for (let i = 1; i <= lastTeam2Over; i++) {
        if (data[i].team2 === null) data[i].team2 = data[i - 1].team2;
    }

    return { chartData: data, team1Name: t1Name, team2Name: t2Name };
  }, [deliveries, innings]);

  if (!chartData || chartData.length === 0) {
    return null;
  }

  return (
    <article className="surface surface-span-12">
      <div className="surface-header">
        <div>
          <p className="kicker">Match momentum</p>
          <h2>The Worm</h2>
          <p className="page-copy">Cumulative runs by over.</p>
        </div>
      </div>
      <div style={{ width: "100%", height: 350, marginTop: "24px", marginLeft: "-20px" }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis 
              dataKey="over" 
              type="number" 
              tickCount={21} 
              domain={[0, 20]} 
              stroke="var(--ink-soft)" 
              tick={{ fill: "var(--ink-soft)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="var(--ink-soft)" 
              tick={{ fill: "var(--ink-soft)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip team1Name={team1Name} team2Name={team2Name} />} />
            <Legend 
              formatter={(value) => <span style={{ color: "var(--ink)", fontWeight: 500 }}>{value === "team1" ? team1Name : team2Name}</span>}
              iconType="circle"
              wrapperStyle={{ paddingTop: "20px" }}
            />
            
            <Line 
              type="monotone" 
              dataKey="team1" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={<CustomizedDot dataKey="team1" />} 
              activeDot={{ r: 6, strokeWidth: 0 }}
              connectNulls={false}
            />
            
            <Line 
              type="monotone" 
              dataKey="team2" 
              stroke="#64748b" 
              strokeWidth={3}
              dot={<CustomizedDot dataKey="team2" />} 
              activeDot={{ r: 6, strokeWidth: 0 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
