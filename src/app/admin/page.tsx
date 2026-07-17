"use client";

import { 
  Users, 
  Store, 
  ShoppingBag, 
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Map
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MESSAGES } from "@/lib/constants";

export default function AdminDashboardPage() {
  const stats = [
    { label: MESSAGES.totalStations, value: "248", icon: Store, trend: "+12", color: "bg-blue-500" },
    { label: MESSAGES.totalUsers, value: "8,420", icon: Users, trend: "+245", color: "bg-purple-500" },
    { label: "Total Orders", value: "15,204", icon: ShoppingBag, trend: "+1,204", color: "bg-green-500" },
    { label: MESSAGES.activeAreas, value: "42", icon: Map, trend: "+3", color: "bg-orange-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{MESSAGES.systemOverview}</h2>
        <p className="text-slate-500 dark:text-slate-400">{MESSAGES.globalMetrics}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" role="region" aria-label="System statistics">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm overflow-hidden bg-white dark:bg-gray-800/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-2xl ${stat.color} text-white shadow-lg`}>
                  <stat.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-100 dark:border-green-800 bg-green-50 dark:bg-green-900/30">
                  {stat.trend}
                </Badge>
              </div>
              <div className="mt-6">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Critical Alerts */}
        <Card className="col-span-1 border-none shadow-sm bg-white dark:bg-gray-800/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg dark:text-white">{MESSAGES.criticalAlerts}</CardTitle>
              <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
            </div>
            <CardDescription>{MESSAGES.requiringAttention}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { title: "Station Verification", desc: "5 stations waiting for documents", priority: "High" },
              { title: "Payment Issue", desc: "GCash API reporting slow response", priority: "Medium" },
              { title: "Dispute", desc: "Refund requested for ORD-1234", priority: "High" },
            ].map((alert, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700">
                <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${alert.priority === "High" ? "bg-red-500" : "bg-orange-500"}`} aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold dark:text-white">{alert.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{alert.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Growth Chart Placeholder */}
        <Card className="col-span-2 border-none shadow-sm bg-white dark:bg-gray-800/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg dark:text-white">{MESSAGES.growthAnalytics}</CardTitle>
              <div className="flex gap-2">
                <Badge variant="secondary">7 Days</Badge>
                <Badge variant="outline">30 Days</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-end justify-between p-6 gap-2" aria-label="Growth chart bar graph">
              {[40, 60, 45, 90, 65, 80, 100].map((h, i) => (
                <div 
                  key={i} 
                  className="w-full bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600 cursor-pointer" 
                  style={{ height: `${h}%` }}
                  role="img"
                  aria-label={`Day ${i + 1}: ${h}%`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-4 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest px-2">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}