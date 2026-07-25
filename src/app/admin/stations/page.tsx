"use client";

import { useState } from "react";
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Store,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminStationsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const stations = [
    { 
      id: "ST-001", 
      name: "AquaPure Makati", 
      owner: "Juan Dela Cruz", 
      location: "Makati City", 
      status: "ACTIVE", 
      rating: 4.8,
      orders: 1240
    },
    { 
      id: "ST-002", 
      name: "Healthy Drops BGC", 
      owner: "Maria Clara", 
      location: "Taguig City", 
      status: "PENDING", 
      rating: 0,
      orders: 0
    },
    { 
      id: "ST-003", 
      name: "Clear Water QC", 
      owner: "Santi Ramos", 
      location: "Quezon City", 
      status: "INACTIVE", 
      rating: 4.2,
      orders: 856
    },
    { 
      id: "ST-004", 
      name: "Spring Fresh Manila", 
      owner: "Elena Garcia", 
      location: "Manila", 
      status: "ACTIVE", 
      rating: 4.5,
      orders: 2100
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE": return <Badge className="bg-green-500 hover:bg-green-500">Active</Badge>;
      case "PENDING": return <Badge className="bg-orange-500 hover:bg-orange-500">Pending Review</Badge>;
      case "INACTIVE": return <Badge variant="secondary">Inactive</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Stations Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Approve, monitor, and manage all water refilling stations.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="rounded-xl flex-1 sm:flex-none dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800/50 rounded-2xl border dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input 
              placeholder="Search station name, ID, or owner..." 
              className="pl-10 rounded-xl bg-slate-50 dark:bg-gray-800 border-none dark:border dark:border-gray-700 dark:text-gray-300 dark:placeholder:text-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Show:</span>
            <select className="bg-transparent text-xs font-bold border-none focus:ring-0 dark:text-gray-300">
              <option>All Stations</option>
              <option>Active</option>
              <option>Pending</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Station</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stations.map((station) => (
                <TableRow key={station.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Store className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm dark:text-white">{station.name}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">{station.id}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium dark:text-gray-300">{station.owner}</TableCell>
                  <TableCell className="text-sm dark:text-gray-300">{station.location}</TableCell>
                  <TableCell className="text-sm dark:text-gray-300">{station.orders.toLocaleString()}</TableCell>
                  <TableCell>{getStatusBadge(station.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full dark:text-gray-400">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl w-48 dark:bg-gray-800 dark:border-gray-700">
                        <DropdownMenuLabel className="dark:text-gray-300">Manage Station</DropdownMenuLabel>
                        <DropdownMenuSeparator className="dark:bg-gray-700" />
                        <DropdownMenuItem className="flex items-center gap-2 dark:text-gray-300 dark:focus:bg-gray-700">
                          <Eye className="h-4 w-4 text-blue-500" />
                          <span>View Details</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center gap-2 dark:text-gray-300 dark:focus:bg-gray-700">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>Approve Station</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center gap-2 dark:text-gray-300 dark:focus:bg-gray-700">
                          <Settings className="h-4 w-4 text-slate-500" />
                          <span>Edit Config</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="dark:bg-gray-700" />
                        <DropdownMenuItem className="flex items-center gap-2 text-red-500 dark:text-red-400 dark:focus:bg-gray-700">
                          <XCircle className="h-4 w-4" />
                          <span>Suspend Station</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}