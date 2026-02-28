import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Mail, Building, Briefcase, Plus, Trash2, Edit, Save, X, Clock, Upload, Download, FileText, File, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";

interface ClientNote {
  id: string;
  client_id: string;
  note: string;
  created_at: string;
}

interface ClientCustomField {
  id: string;
  client_id: string;
  field_name: string;
  field_value: string | null;
  created_at: string;
}

interface ClientAttachment {
  id: string;
  client_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  created_at: string;
}

interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  position: string | null;
  created_at: string;
  notes: ClientNote[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "📊";
  if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "📽️";
  if (mimeType.includes("image")) return "🖼️";
  return "📎";
}

export default function ClientDetailPage() {
  const navigate = useNavigate();
  const { id: clientId } = useParams();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingFieldName, setEditingFieldName] = useState("");
  const [editingFieldValue, setEditingFieldValue] = useState("");

  const { data: client, isLoading, error } = useQuery<Client>({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}`);
      if (!res.ok) throw new Error("Failed to fetch client");
      return res.json();
    },
    enabled: !!clientId,
  });

  const { data: customFields = [] } = useQuery<ClientCustomField[]>({
    queryKey: ["clientFields", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/fields`);
      if (!res.ok) throw new Error("Failed to fetch custom fields");
      return res.json();
    },
    enabled: !!clientId,
  });

  const { data: attachments = [] } = useQuery<ClientAttachment[]>({
    queryKey: ["clientAttachments", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/attachments`);
      if (!res.ok) throw new Error("Failed to fetch attachments");
      return res.json();
    },
    enabled: !!clientId,
  });

  const createNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      const res = await fetch(`/api/clients/${clientId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error("Failed to create note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client", clientId] });
      setNewNote("");
      toast.success("Note added");
    },
    onError: () => toast.error("Failed to add note"),
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, note }: { noteId: string; note: string }) => {
      const res = await fetch(`/api/clients/${clientId}/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error("Failed to update note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client", clientId] });
      setEditingNoteId(null);
      setEditingNoteText("");
      toast.success("Note updated");
    },
    onError: () => toast.error("Failed to update note"),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const res = await fetch(`/api/clients/${clientId}/notes/${noteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client", clientId] });
      toast.success("Note deleted");
    },
    onError: () => toast.error("Failed to delete note"),
  });

  const createFieldMutation = useMutation({
    mutationFn: async ({ fieldName, fieldValue }: { fieldName: string; fieldValue: string }) => {
      const res = await fetch(`/api/clients/${clientId}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldName, fieldValue }),
      });
      if (!res.ok) throw new Error("Failed to create field");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientFields", clientId] });
      setNewFieldName("");
      setNewFieldValue("");
      toast.success("Custom field added");
    },
    onError: () => toast.error("Failed to add custom field"),
  });

  const updateFieldMutation = useMutation({
    mutationFn: async ({ fieldId, fieldName, fieldValue }: { fieldId: string; fieldName: string; fieldValue: string }) => {
      const res = await fetch(`/api/clients/${clientId}/fields/${fieldId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldName, fieldValue }),
      });
      if (!res.ok) throw new Error("Failed to update field");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientFields", clientId] });
      setEditingFieldId(null);
      toast.success("Custom field updated");
    },
    onError: () => toast.error("Failed to update custom field"),
  });

  const deleteFieldMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      const res = await fetch(`/api/clients/${clientId}/fields/${fieldId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete field");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientFields", clientId] });
      toast.success("Custom field deleted");
    },
    onError: () => toast.error("Failed to delete custom field"),
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/clients/${clientId}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload file");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientAttachments", clientId] });
      toast.success("File uploaded");
    },
    onError: () => toast.error("Failed to upload file"),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const res = await fetch(`/api/clients/${clientId}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete attachment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientAttachments", clientId] });
      toast.success("File deleted");
    },
    onError: () => toast.error("Failed to delete file"),
  });

  const handleAddNote = () => {
    if (!newNote.trim()) {
      toast.error("Please enter a note");
      return;
    }
    createNoteMutation.mutate(newNote);
  };

  const handleUpdateNote = (noteId: string) => {
    if (!editingNoteText.trim()) {
      toast.error("Note cannot be empty");
      return;
    }
    updateNoteMutation.mutate({ noteId, note: editingNoteText });
  };

  const handleAddField = () => {
    if (!newFieldName.trim()) {
      toast.error("Please enter a field name");
      return;
    }
    createFieldMutation.mutate({ fieldName: newFieldName, fieldValue: newFieldValue });
  };

  const handleUpdateField = () => {
    if (!editingFieldId || !editingFieldName.trim()) {
      toast.error("Field name cannot be empty");
      return;
    }
    updateFieldMutation.mutate({ fieldId: editingFieldId, fieldName: editingFieldName, fieldValue: editingFieldValue });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAttachmentMutation.mutate(file);
    }
    e.target.value = "";
  };

  const handleDownload = (attachmentId: string) => {
    window.open(`/api/clients/${clientId}/attachments/${attachmentId}/download`, "_blank");
  };

  const startEditingNote = (note: ClientNote) => {
    setEditingNoteId(note.id);
    setEditingNoteText(note.note);
  };

  const startEditingField = (field: ClientCustomField) => {
    setEditingFieldId(field.id);
    setEditingFieldName(field.field_name);
    setEditingFieldValue(field.field_value || "");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading client details...</div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/clients")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Clients
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-red-500">
            Client not found
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/clients")} data-testid="button-back">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Clients
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-xl" data-testid="text-client-name">
              {client.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client.company && (
              <div className="flex items-center gap-3 text-gray-600">
                <Building className="w-5 h-5" />
                <span data-testid="text-client-company">{client.company}</span>
              </div>
            )}
            {client.position && (
              <div className="flex items-center gap-3 text-gray-600">
                <Briefcase className="w-5 h-5" />
                <span data-testid="text-client-position">{client.position}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-600" />
                <a
                  href={`mailto:${client.email}`}
                  className="text-blue-600 hover:underline"
                  data-testid="link-client-email"
                >
                  {client.email}
                </a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-600" />
                <a
                  href={`tel:${client.phone}`}
                  className="text-blue-600 hover:underline"
                  data-testid="link-client-phone"
                >
                  {client.phone}
                </a>
              </div>
            )}

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Custom Fields
              </h4>
              
              {customFields.length > 0 && (
                <div className="space-y-2 mb-4">
                  {customFields.map((field) => (
                    <div key={field.id} className="bg-gray-50 rounded p-2" data-testid={`field-${field.id}`}>
                      {editingFieldId === field.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editingFieldName}
                            onChange={(e) => setEditingFieldName(e.target.value)}
                            placeholder="Field name"
                            className="text-sm"
                            data-testid="input-edit-field-name"
                          />
                          <Input
                            value={editingFieldValue}
                            onChange={(e) => setEditingFieldValue(e.target.value)}
                            placeholder="Field value"
                            className="text-sm"
                            data-testid="input-edit-field-value"
                          />
                          <div className="flex gap-1">
                            <Button size="sm" onClick={handleUpdateField} data-testid="button-save-field">
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingFieldId(null)} data-testid="button-cancel-field">
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-xs font-medium text-gray-500">{field.field_name}</div>
                            <div className="text-sm">{field.field_value || "-"}</div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => startEditingField(field)} data-testid={`button-edit-field-${field.id}`}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-500"
                              onClick={() => deleteFieldMutation.mutate(field.id)}
                              data-testid={`button-delete-field-${field.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Input
                  placeholder="Field name"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="text-sm"
                  data-testid="input-new-field-name"
                />
                <Input
                  placeholder="Field value"
                  value={newFieldValue}
                  onChange={(e) => setNewFieldValue(e.target.value)}
                  className="text-sm"
                  data-testid="input-new-field-value"
                />
                <Button size="sm" onClick={handleAddField} className="w-full" data-testid="button-add-field">
                  <Plus className="w-3 h-3 mr-1" />
                  Add Field
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t text-sm text-gray-400">
              Added {format(new Date(client.created_at), "MMM d, yyyy")}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a new note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                  data-testid="input-new-note"
                />
                <Button
                  onClick={handleAddNote}
                  disabled={createNoteMutation.isPending}
                  data-testid="button-add-note"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Note
                </Button>
              </div>

              <div className="border-t pt-4">
                {client.notes.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No notes yet. Add your first note above.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {client.notes.map((note) => (
                      <div
                        key={note.id}
                        className="bg-gray-50 rounded-lg p-4"
                        data-testid={`note-${note.id}`}
                      >
                        {editingNoteId === note.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editingNoteText}
                              onChange={(e) => setEditingNoteText(e.target.value)}
                              rows={3}
                              data-testid="input-edit-note"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleUpdateNote(note.id)}
                                disabled={updateNoteMutation.isPending}
                                data-testid="button-save-note"
                              >
                                <Save className="w-4 h-4 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingNoteId(null);
                                  setEditingNoteText("");
                                }}
                                data-testid="button-cancel-edit"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-gray-700 whitespace-pre-wrap" data-testid={`text-note-${note.id}`}>
                              {note.note}
                            </p>
                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200">
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Clock className="w-3 h-3" />
                                {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditingNote(note)}
                                  data-testid={`button-edit-note-${note.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => {
                                    if (confirm("Delete this note?")) {
                                      deleteNoteMutation.mutate(note.id);
                                    }
                                  }}
                                  data-testid={`button-delete-note-${note.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <File className="w-5 h-5" />
                Attachments
              </CardTitle>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt"
                  data-testid="input-file-upload"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadAttachmentMutation.isPending}
                  data-testid="button-upload-file"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {attachments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No files attached yet. Upload your first file above.
                </p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                      data-testid={`attachment-${attachment.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getFileIcon(attachment.mime_type)}</span>
                        <div>
                          <div className="font-medium text-sm" data-testid={`text-filename-${attachment.id}`}>
                            {attachment.original_name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatFileSize(attachment.size)} • {format(new Date(attachment.created_at), "MMM d, yyyy")}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(attachment.id)}
                          data-testid={`button-download-${attachment.id}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => {
                            if (confirm("Delete this file?")) {
                              deleteAttachmentMutation.mutate(attachment.id);
                            }
                          }}
                          data-testid={`button-delete-attachment-${attachment.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}