"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import type { TimeValue } from "@internationalized/date"

export interface TimeFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  value: TimeValue | undefined
  onChange: (value: TimeValue) => void
}

export const TimeField = React.forwardRef<HTMLDivElement, TimeFieldProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const hour = Number.parseInt(e.target.value)
      if (!isNaN(hour) && hour >= 0 && hour <= 23) {
        onChange({ ...value, hour })
      }
    }

    const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const minute = Number.parseInt(e.target.value)
      if (!isNaN(minute) && minute >= 0 && minute <= 59) {
        onChange({ ...value, minute })
      }
    }

    return (
      <div className={cn("flex items-center space-x-2", className)} ref={ref} {...props}>
        <input
          type="number"
          value={value?.hour ?? ""}
          onChange={handleHourChange}
          placeholder="HH"
          className="w-16 border rounded-md px-2 py-1 text-center"
          min="0"
          max="23"
        />
        :
        <input
          type="number"
          value={value?.minute ?? ""}
          onChange={handleMinuteChange}
          placeholder="MM"
          className="w-16 border rounded-md px-2 py-1 text-center"
          min="0"
          max="59"
        />
      </div>
    )
  },
)
TimeField.displayName = "TimeField"
