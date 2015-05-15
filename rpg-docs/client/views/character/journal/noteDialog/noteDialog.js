Template.noteDialog.helpers({
	note: function(){
		return Notes.findOne(this.noteId);
	}
});

Template.noteDialog.events({
	"color-change": function(event, instance){
		Notes.update(instance.data.noteId, {$set: {color: event.color}});
	},
	"tap #deleteButton": function(event, instance){
		Notes.softRemove(instance.data.noteId);
		GlobalUI.deletedToast(instance.data.noteId, "Notes", "Note");
		GlobalUI.closeDetail();
	},
});

Template.noteDialogEdit.onRendered(function(){
	updatePolymerInputs(this);
});

Template.noteDialogEdit.events({
	"change #noteNameInput, input #noteNameInput": function(event){
		var value = event.currentTarget.value;
		Notes.update(this._id, {$set: {name: value}});
	},
	"change #noteDescriptionInput": function(event){
		var value = event.currentTarget.value;
		Notes.update(this._id, {$set: {description: value}});
	},
});
