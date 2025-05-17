interface ChartProps {
  data: any[]
  index: string
  categories: string[]
  colors: string[]
  valueFormatter?: (value: number) => string
  yAxisWidth?: number
}

export const BarChart = (props: ChartProps) => {
  return <div>BarChart - Implement chart here</div>
}

export const LineChart = (props: ChartProps) => {
  return <div>LineChart - Implement chart here</div>
}

export const PieChart = (props: {
  data: any[]
  index: string
  category: string
  valueFormatter?: (value: number) => string
  colors: string[]
}) => {
  return <div>PieChart - Implement chart here</div>
}
