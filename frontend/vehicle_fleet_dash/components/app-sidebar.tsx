"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  Car
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { source } from "@/lib/source";


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // 1. Get the page tree from Fumadocs
  const tree = source.pageTree.children;
  console.log('tree length:', tree.length);
console.log('tree:', JSON.stringify(tree, null, 2));

  // 2. Map the Fumadocs tree to your Sidebar format
  const docItems = tree.map((node) => {
    if (node.type === 'folder') {
      return {
        title: String(node.name),
        url: "#",
        items: node.children.map((child) => ({
          title: String(child.name),
          url: (child as any).url || "#",
        })),
      };
    }
    return {
      title: String(node.name),
      url: (node as any).url || "#",
    };
  });

  // 3. Reconstruct your data object
  const data = {
    teams: [
      {
        name: "JárműŐr",
        logo: Car,
        plan: "Vállalat",
      },
    ],
    navMain: [
      {
        title: "Dokumentáció",
        url: "/docs",
        icon: BookOpen,
        isActive: true,
        items: docItems, 
      },
      
    ],
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser/>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}