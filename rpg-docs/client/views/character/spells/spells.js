var spellLevels = [
	{name: "Cantrips", level: 0},
	{name: "Level 1",  level: 1},
	{name: "Level 2",  level: 2},
	{name: "Level 3",  level: 3},
	{name: "Level 4",  level: 4},
	{name: "Level 5",  level: 5},
	{name: "Level 6",  level: 6},
	{name: "Level 7",  level: 7},
	{name: "Level 8",  level: 8},
	{name: "Level 9",  level: 9},
];

var materialNeedsGp = function(string) {
	if (!string) return false;
	gpRegExp = /\b[0-9]+ ?(cp|sp|gp)\b/i;
	return gpRegExp.test(string);
}

const showUnprepared = (listId) => {
	return Session.get(`showUnprepared.${listId}`);
}

Template.spells.helpers({
	spellLists: function(){
		return SpellLists.find({charId: this._id}, {sort: {color: 1, name: 1}});
	},
	spellCount: function(list, charId){
		if (!list) return;
		if (showUnprepared(list._id)){
			return Spells.find(
				{charId: charId, "parent.id": list._id, level: this.level},
				{fields: {_id: 1, level: 1}}
			).count() > 0;
		} else {
			return Spells.find(
				{
					charId: charId,
					"parent.id": list._id,
					level: this.level,
					prepared: {$in: ["prepared", "always"]},
				},
				{fields: {_id: 1, level: 1}}
			).count() > 0;
		}
	},
	spells: function(listId, charId){
		return Spells.find(
			{charId: charId, "parent.id": listId, level: this.level},
			{sort: {color: 1, name: 1}}
		);
	},
	levels: function(){
		return spellLevels;
	},
	showUnprepared: function(listId){
		return showUnprepared(listId);
	},
	numPrepared: function(){
		return Spells.find({
				charId: Template.parentData()._id,
				"parent.id": this._id,
				prepared: "prepared",
			}).count();
	},
	order: function(){
		return _.indexOf(_.keys(colorOptions), this.color);
	},
	spellComponents: function(){
		var components = "";
		if (this.components.verbal){
			components += "V";
		}
		if (this.components.somatic){
			components += components ? ", S" : "S";
		}
		if (this.components.material){
			components += components ? ", M" : "M";
			if (materialNeedsGp(this.components.material)) {components+="gp";}
		}
		if (this.components.concentration){
			components += components ? ", C" : "C";
		}
		return components;
	},
	isPrepared: function(){
		return this.prepared === "prepared" || this.prepared === "always";
	},
	showSpell: function(listId){
		if (showUnprepared(listId)) {
			return true;
		} else {
			return this.prepared === "prepared" || this.prepared === "always";
		}
	},
	cantUnprepare: function(){
		return this.prepared === "always";
	},
	cantCast: function(level, char){
		for (var i = level; i <= 9; i++){
			if (Characters.calculate.attributeValue(
				char._id, "level" + i + "SpellSlots"
			) > 0){
				return false;
			}
		}
		return true;
	},
	showSlots: function(char){
		return this.level && Characters.calculate.attributeBase(
			char._id, "level" + this.level + "SpellSlots"
		);
	},
	hasSlots: function(){
		for (var i = 1; i <= 9; i += 1){
			if (Characters.calculate.attributeBase(
				this._id, "level" + i + "SpellSlots"
			)){
				return true;
			}
		}
		return false;
	},
	slotBubbles: function(char){
		var baseSlots = Characters.calculate.attributeBase(
			char._id, "level" + this.level + "SpellSlots"
		);
		var currentSlots = Characters.calculate.attributeValue(
			char._id, "level" + this.level + "SpellSlots"
		);
		var slotsUsed = baseSlots - currentSlots;
		var bubbles = [];
		var i;
		for (i = 0; i < currentSlots; i++){
			bubbles.push({
				icon: "radio-button-checked",
				disabled: i !== currentSlots - 1 || !canEditCharacter(char._id), //last full slot not disabled
				attribute: "level" + this.level + "SpellSlots",
				charId: char._id,
			});
		}
		for (i = 0; i < slotsUsed; i++){
			bubbles.push({
				icon: "radio-button-unchecked",
				disabled: i !== 0 || !canEditCharacter(char._id), //first empty slot not disabled
				attribute: "level" + this.level + "SpellSlots",
				charId: char._id,
			});
		}
		return bubbles;
	},
	slotStatName: function() {
		return "level" + this.level + "SpellSlots";
	},
});

Template.spells.events({
	"click .slotBubble": function(event){
		var modifier;
		if (!event.currentTarget.disabled){
			var char = Characters.findOne(this.charId);
			if (event.currentTarget.icon === "radio-button-unchecked"){
				if (
					Characters.calculate.attributeValue(char._id, this.attribute) <
					Characters.calculate.attributeBase(char._id, this.attribute)
				){
					modifier = {$inc: {}};
					modifier.$inc[this.attribute + ".adjustment"] = 1;
					Characters.update(this.charId, modifier, {validate: false});
				}
			} else {
				if (Characters.calculate.attributeValue(char._id, this.attribute) > 0){
					modifier = {$inc: {}};
					modifier.$inc[this.attribute + ".adjustment"] = -1;
					Characters.update(this.charId, modifier, {validate: false});
				}
			}
		}
		event.stopPropagation();
	},
	"click .spellSlot": function(event, instance) {
		var name = "Level " + this.level + " Spell Slots";
		var stat = "level" + this.level + "SpellSlots";
		var charId = instance.data._id;
		pushDialogStack({
			template: "attributeDialog",
			data:     {name: name, statName: stat, charId: charId},
			element: event.currentTarget,
		});
	},
	"click .spellList .top": function(event){
		pushDialogStack({
			template: "spellListDialog",
			data:     {spellListId: this._id, charId: this.charId},
			element: event.currentTarget.parentElement,
		});
	},
	"click .spell": function(event){
		pushDialogStack({
			template: "spellDialog",
			data:     {spellId: this._id, charId: this.charId},
			element: event.currentTarget,
		});
	},
	"click .addSpellList": function(event, instance){
		var charId = this.charId;
		var id = SpellLists.insert({
			name: "New SpellList",
			charId: this._id,
			saveDC: "8 + intelligenceMod + proficiencyBonus",
			attackBonus: "intelligenceMod + proficiencyBonus",
		});
		pushDialogStack({
			template: "spellListDialog",
			data:     {spellListId: id, charId: charId, startEditing: true},
			element: event.currentTarget,
			returnElement: () => instance.find(`.spellList[data-id='${id}']`),
		});
	},
	"click .addSpell": function(event, instance){
		var charId = this._id;
		var list = SpellLists.findOne({charId});
		var listId = list && list._id
		if (!listId){
			listId = SpellLists.insert({
				name: "New SpellList",
				charId: charId,
				saveDC: "8 + intelligenceMod + proficiencyBonus",
				attackBonus: "intelligenceMod + proficiencyBonus",
			});
		}
		var id = Spells.insert({
			name: "New Spell",
			charId: this._id,
			parent: {
				id: listId,
				collection: "SpellLists",
			},
			prepared: "prepared",
		});
		pushDialogStack({
			template: "spellDialog",
			data:     {spellId: id, charId: charId, startEditing: true},
			element: event.currentTarget,
			returnElement: () => instance.find(`.spell[data-id='${id}']`),
		});
	},
	"click .librarySpell": function(event, instance){
		var charId = this._id;
		var spellId = Random.id();
		var list = SpellLists.findOne({charId});
		var listId = list && list._id
		pushDialogStack({
			template: "spellLibraryDialog",
			element: event.currentTarget,
			callback: (result) => {
				if (!result) return;
				if (!listId){
					listId = SpellLists.insert({
						name: "New SpellList",
						charId: charId,
						saveDC: "8 + intelligenceMod + proficiencyBonus",
						attackBonus: "intelligenceMod + proficiencyBonus",
					});
				}
				// Make the library spell into a regular spell
				let spell = _.omit(result, "library", "attacks", "effects");
				spell._id = spellId;
				spell.charId = charId;
				spell.parent = {
					id: listId,
					collection: "SpellLists",
				};
				spell.prepared = "prepared";
				Spells.insert(spell);
				// Copy over attacks and effects
				_.each(result.attacks, (attack) => {
					attack.charId = charId;
					attack.parent = {id: spellId, collection: "Spells"};
					Attacks.insert(attack);
				});
				_.each(result.effects, (effect) => {
					effect.charId = charId;
					effect.parent = {id: spellId, collection: "Spells"};
					Effects.insert(effect);
				});
			},
			returnElement: () => $(`[data-id='${spellId}']`).get(0),
		})
	},
	"click .preparedCheckbox": function(event){
		event.stopPropagation();
	},
	"change .preparedCheckbox": function(event){
		var value = event.currentTarget.checked;
		if (this.prepared === "unprepared" && value)
			Spells.update(this._id, {$set: {prepared: "prepared"}});
		else if (this.prepared === "prepared" && !value)
			Spells.update(this._id, {$set: {prepared: "unprepared"}});
	},
	"click .prepSpells": function(event){
		Session.set(`showUnprepared.${this._id}`, true);
		event.stopPropagation();
	},
	"click .finishPrep": function(event){
		Session.set(`showUnprepared.${this._id}`, false);
		event.stopPropagation();
	},
});
