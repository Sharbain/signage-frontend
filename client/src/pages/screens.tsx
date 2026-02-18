import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Filter, 
  MoreVertical, 
  RefreshCw,
  Power,
  Monitor
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import generatedImage from '@assets/generated_images/modern_abstract_geometric_waves_for_digital_signage_content.png';

export default function Screens() {
  const { data: screens = [], isLoading } = useQuery({
    queryKey: ["screens"],
    queryFn: api.screens.getAll,
  });
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading screens...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Device Management</h2>
          <p className="text-muted-foreground">Monitor and control your display network</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search displays..." className="pl-9 bg-card border-border" />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          <Button>
            <Monitor className="h-4 w-4 mr-2" />
            Add Display
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {screens.map((screen: any) => (
          <Card key={screen.id} className="group overflow-hidden border-border bg-card hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
            <div className="relative h-40 bg-black/50 border-b border-border group-hover:opacity-100 transition-opacity">
              {screen.status !== 'offline' && (
                 <img 
                  src={generatedImage} 
                  alt="Screen Content" 
                  className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" 
                />
              )}
              {screen.status === 'offline' && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                   <Power className="h-12 w-12 text-muted-foreground/50" />
                </div>
              )}
              
              <div className="absolute top-3 right-3">
                <Badge variant={screen.status === 'online' ? 'default' : screen.status === 'offline' ? 'destructive' : 'secondary'} 
                  className={screen.status === 'online' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border-green-500/50' : ''}>
                  {screen.status}
                </Badge>
              </div>
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                 <Badge variant="outline" className="bg-black/50 backdrop-blur border-white/10 text-white/80">
                    {screen.resolution}
                 </Badge>
              </div>
            </div>
            
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-display font-semibold text-lg truncate pr-4">{screen.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{screen.deviceId} • {screen.location}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  Playing: <span className="text-foreground font-medium">{screen.currentContent || "No content"}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" asChild>
                    <a href={`/player/${screen.deviceId}`} target="_blank" title="Open Player View">
                      <Monitor className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
