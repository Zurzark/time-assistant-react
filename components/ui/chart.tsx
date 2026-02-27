"use client"

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts"

const colorMap: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  violet: "#8b5cf6",
  yellow: "#eab308",
  gray: "#6b7280",
  red: "#ef4444",
  indigo: "#6366f1",
  pink: "#ec4899",
}

const getColor = (color: string) => colorMap[color] || color

interface ChartProps {
  data: any[]
  index: string
  categories: string[]
  colors: string[]
  valueFormatter?: (value: number) => string
  yAxisWidth?: number
}

export const BarChart = ({
  data,
  index,
  categories,
  colors,
  valueFormatter = (value: number) => `${value}`,
  yAxisWidth = 40,
}: ChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey={index}
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={valueFormatter}
          width={yAxisWidth}
        />
        <Tooltip
          cursor={{ fill: "transparent" }}
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        {label}
                      </span>
                      {payload.map((item, i) => (
                        <span key={i} className="font-bold text-muted-foreground">
                          {item.name}: {valueFormatter(item.value as number)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            }
            return null
          }}
        />
        <Legend />
        {categories.map((category, i) => (
          <Bar
            key={category}
            dataKey={category}
            fill={getColor(colors[i % colors.length])}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}

export const LineChart = ({
  data,
  index,
  categories,
  colors,
  valueFormatter = (value: number) => `${value}`,
  yAxisWidth = 40,
}: ChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey={index}
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={valueFormatter}
          width={yAxisWidth}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        {label}
                      </span>
                      {payload.map((item, i) => (
                        <span key={i} className="font-bold text-muted-foreground">
                          {item.name}: {valueFormatter(item.value as number)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            }
            return null
          }}
        />
        <Legend />
        {categories.map((category, i) => (
          <Line
            key={category}
            type="monotone"
            dataKey={category}
            stroke={getColor(colors[i % colors.length])}
            strokeWidth={2}
            activeDot={{ r: 4 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}

export const PieChart = ({
  data,
  index,
  category,
  valueFormatter = (value: number) => `${value}`,
  colors,
}: {
  data: any[]
  index: string
  category: string
  valueFormatter?: (value: number) => string
  colors: string[]
}) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={150}
          fill="#8884d8"
          dataKey={category}
          nameKey={index}
        >
          {data.map((entry, i) => (
            <Cell key={`cell-${i}`} fill={getColor(colors[i % colors.length])} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                      {data[index]}
                    </span>
                    <span className="font-bold text-muted-foreground">
                      {valueFormatter(data[category] as number)}
                    </span>
                  </div>
                </div>
              )
            }
            return null
          }}
        />
        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  )
}
