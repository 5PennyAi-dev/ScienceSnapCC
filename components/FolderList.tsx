import React, { useState } from 'react';
import { Folder, Plus, Trash2, FolderOpen, Check, X } from 'lucide-react';
import { Folder as FolderType } from '../types';

interface FolderListProps {
  folders: FolderType[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onDropItem: (folderId: string, itemId: string) => void;
  draggedItemId?: string | null;
}

export const FolderList: React.FC<FolderListProps> = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onDropItem,
  draggedItemId
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [dragCounter, setDragCounter] = useState(0);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreating(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget; // Capture reference before async callback
    setDragCounter(prev => prev + 1);
    target.classList.add('bg-cyan-100');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget; // Capture reference before async callback
    setDragCounter(prev => {
      const newCount = prev - 1;
      if (newCount <= 0) {
        target.classList.remove('bg-cyan-100');
        return 0;
      }
      return newCount;
    });
  };

  const handleDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget; // Capture reference before async callback
    setDragCounter(0);
    target.classList.remove('bg-cyan-100');
    
    // Try both dataTransfer and prop-based state
    const dataTransferId = e.dataTransfer.getData('text/plain');
    const itemId = draggedItemId || dataTransferId;
    
    console.log('Dropping item:', itemId, 'into folder:', folderId);
    if (itemId) {
      onDropItem(folderId, itemId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Dossiers</h3>
        <button
          onClick={() => setIsCreating(true)}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors text-cyan-600"
          title="Nouveau dossier"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {/* All Items (No Folder) */}
        <button
          onClick={() => onSelectFolder(null)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
            selectedFolderId === null
              ? 'bg-cyan-50 text-cyan-700 font-bold'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span className="text-sm">Tous les items</span>
        </button>

        {/* Folder List */}
        {folders.map((folder) => (
          <div
            key={folder.id}
            onClick={() => onSelectFolder(folder.id)}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, folder.id)}
            className={`group w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all cursor-pointer border border-transparent ${
              selectedFolderId === folder.id
                ? 'bg-cyan-50 text-cyan-700 font-bold border-cyan-200'
                : 'text-gray-600 hover:bg-gray-50 hover:border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3 overflow-hidden pointer-events-none">
              <Folder className={`w-4 h-4 flex-shrink-0 ${selectedFolderId === folder.id ? 'fill-cyan-200' : ''}`} />
              <span className="text-sm truncate">{folder.name}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Supprimer ce dossier ?')) onDeleteFolder(folder.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-600 rounded transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}

        {/* Create New Folder Input */}
        {isCreating && (
          <form onSubmit={handleCreateSubmit} className="px-2">
            <div className="flex items-center gap-2 bg-white border-2 border-cyan-300 rounded-lg p-1">
              <input
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nom du dossier..."
                className="w-full text-xs p-1 outline-none text-black"
                onBlur={() => !newFolderName && setIsCreating(false)}
              />
              <button type="submit" className="p-1 text-green-600 hover:bg-green-50 rounded">
                <Check className="w-3 h-3" />
              </button>
              <button 
                type="button" 
                onClick={() => setIsCreating(false)}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
