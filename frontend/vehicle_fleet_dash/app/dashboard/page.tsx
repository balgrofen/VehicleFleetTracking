"use client";
import { useEffect, useState } from "react";
import * as React from "react"
import dynamic from "next/dynamic"; 
const TrackingMap = dynamic(() => import("@/components/TrackingMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-muted animate-pulse rounded-m" />, 
});
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {Card} from "@/components/ui/card"
import TripFinder from "@/components/tripfinder"

interface TrackingMapProps {
  tripId: string | null; // The component now expects 'tripId'
}


export default function Page() {
  const [activeTripId, setActiveTripId] = React.useState<string | null>(null);
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Jármű követés
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Korábbi adatok</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-2">
          <div className="bg-muted/50 aspect-video rounded-m">
            <Card>
              <TrackingMap tripId={activeTripId} />
            </Card>
            </div>
          <div className="grid auto-rows-min gap-4 md:grid-cols-2 md:grid-rows-2">
            <div className="bg-muted/50 aspect-video rounded-xl"><TripFinder onSelectTrip={setActiveTripId}/></div>
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
          </div>
        </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
