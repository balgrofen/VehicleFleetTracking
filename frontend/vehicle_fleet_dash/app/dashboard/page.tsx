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
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface TrackingMapProps {
  tripId: string | null; // The component now expects 'tripId'
}


export default function Page() {
  const [activeTripId, setActiveTripId] = React.useState<string | null>(null);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login"); // Ha nincs user, irány a login oldal
    }
  }, [user, loading, router]);

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
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize="75%"><TrackingMap tripId={activeTripId} /></ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="25%"><TripFinder onSelectTrip={setActiveTripId}/></ResizablePanel>
          </ResizablePanelGroup>
      </SidebarInset>
    </SidebarProvider>
  )
}
