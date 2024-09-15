import {
  ClassicEditor,
  Bold,
  Italic,
  Essentials,
  Heading,
  List,
  Paragraph,
  Command,
  Plugin,
  ButtonView,
  Widget,
  toWidget,
  toWidgetEditable
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';
import CKEditorInspector from '@ckeditor/ckeditor5-inspector';  

class Spoiler extends Plugin {
  static get requires() {
      return [ SpoilerEditing, SpoilerUI ];
  }
}

class SpoilerUI extends Plugin {
  init() {
      console.log( 'SpoilerUI#init() got called' );

      const editor = this.editor;
      const t = editor.t;

      // The "Spoiler" button must be registered among the UI components of the editor
      // to be displayed in the toolbar.
      editor.ui.componentFactory.add( 'Spoiler', locale => {
          // The state of the button will be bound to the widget command.
          const command = editor.commands.get( 'insertSpoiler' );

          // The button will be an instance of ButtonView.
          const buttonView = new ButtonView( locale );

          buttonView.set( {
              // The t() function helps localize the editor. All strings enclosed in t() can be
              // translated and change when the language of the editor changes.
              label: t( 'Spoiler' ),
              withText: true,
              tooltip: true
          } );

          // Bind the state of the button to the command.
          buttonView.bind( 'isOn', 'isEnabled' ).to( command, 'value', 'isEnabled' );

          // Execute the command when the button is clicked (executed).
          this.listenTo( buttonView, 'execute', () => editor.execute( 'insertSpoiler' ) );

          return buttonView;
      } );
  }
}

class SpoilerEditing extends Plugin {
  static get requires() {
      return [ Widget ];
  }

  init() {
      console.log( 'SpoilerEditing#init() got called' );

      this._defineSchema();
      this._defineConverters();

      this.editor.commands.add( 'insertSpoiler', new InsertSpoilerCommand( this.editor ) );
  }

  _defineSchema() {
      const schema = this.editor.model.schema;

      schema.register( 'Spoiler', {
          // Behaves like a self-contained block object (e.g. a block image)
          // allowed in places where other blocks are allowed (e.g. directly in the root).
          inheritAllFrom: '$blockObject'
      } );

      schema.register( 'SpoilerTitle', {
          // Cannot be split or left by the caret.
          isLimit: true,

          allowIn: 'Spoiler',

          // Allow content which is allowed in blocks (i.e. text with attributes).
          allowContentOf: '$block'
      } );

      schema.register( 'SpoilerDescription', {
          // Cannot be split or left by the caret.
          isLimit: true,

          allowIn: 'Spoiler',

          // Allow content which is allowed in the root (e.g. paragraphs).
          allowContentOf: '$root'
      } );

      schema.addChildCheck( ( context, childDefinition ) => {
          if ( context.endsWith( 'SpoilerDescription' ) && childDefinition.name == 'Spoiler' ) {
              return false;
          }
      } );
  }

  _defineConverters() {
      const conversion = this.editor.conversion;

      // <Spoiler> converters
      conversion.for( 'upcast' ).elementToElement( {
          model: 'Spoiler',
          view: {
              name: 'details',
              classes: 'spoiler'
          }
      } );
      conversion.for( 'dataDowncast' ).elementToElement( {
          model: 'Spoiler',
          view: {
              name: 'details',
              classes: 'spoiler'
          }
      } );
      conversion.for( 'editingDowncast' ).elementToElement( {
          model: 'Spoiler',
          view: ( modelElement, { writer: viewWriter } ) => {
              const details = viewWriter.createContainerElement( 'details', { class: 'spoiler' } );

              return toWidget( details, viewWriter, { label: 'Spoiler widget' } );
          }
      } );

      // <SpoilerTitle> converters
      conversion.for( 'upcast' ).elementToElement( {
          model: 'SpoilerTitle',
          view: {
              name: 'summary',
              classes: 'spoiler-title'
          }
      } );
      conversion.for( 'dataDowncast' ).elementToElement( {
          model: 'SpoilerTitle',
          view: {
              name: 'summary',
              classes: 'spoiler-title'
          }
      } );
      conversion.for( 'editingDowncast' ).elementToElement( {
          model: 'SpoilerTitle',
          view: ( modelElement, { writer: viewWriter } ) => {
              // Note: You use a more specialized createEditableElement() method here.
              const summary = viewWriter.createEditableElement( 'summary', { class: 'spoiler-title' } );

              return toWidgetEditable( summary, viewWriter );
          }
      } );

      // <SpoilerDescription> converters
      conversion.for( 'upcast' ).elementToElement( {
          model: 'SpoilerDescription',
          view: {
              name: 'div',
              classes: 'spoiler-description'
          }
      } );
      conversion.for( 'dataDowncast' ).elementToElement( {
          model: 'SpoilerDescription',
          view: {
              name: 'div',
              classes: 'spoiler-description'
          }
      } );
      conversion.for( 'editingDowncast' ).elementToElement( {
          model: 'SpoilerDescription',
          view: ( modelElement, { writer: viewWriter } ) => {
              // Note: You use a more specialized createEditableElement() method here.
              const div = viewWriter.createEditableElement( 'div', { class: 'spoiler-description' } );

              return toWidgetEditable( div, viewWriter );
          }
      } );
  }
}

class InsertSpoilerCommand extends Command {
  execute() {
      this.editor.model.change( writer => {
          // Insert <Spoiler>*</Spoiler> at the current selection position
          // in a way that will result in creating a valid model structure.
          this.editor.model.insertContent( createSpoiler( writer ) );
      } );
  }

  refresh() {
      const model = this.editor.model;
      const selection = model.document.selection;
      const allowedIn = model.schema.findAllowedParent( selection.getFirstPosition(), 'Spoiler' );

      this.isEnabled = allowedIn !== null;
  }
}

function createSpoiler( writer ) {
  console.log('creator')
  const Spoiler = writer.createElement( 'Spoiler' );
  const SpoilerTitle = writer.createElement( 'SpoilerTitle' );
  const SpoilerDescription = writer.createElement( 'SpoilerDescription' );

  writer.append( SpoilerTitle, Spoiler );
  writer.append( SpoilerDescription, Spoiler );

  // There must be at least one paragraph for the description to be editable.
  // See https://github.com/ckeditor/ckeditor5/issues/1464.
  writer.appendElement( 'paragraph', SpoilerDescription );

  return Spoiler;
}

ClassicEditor
  .create( document.querySelector( '#editor' ), {
      plugins: [ Essentials, Bold, Italic, Heading, List, Paragraph, Spoiler ],
      toolbar: [ 'heading', '|', 'bold', 'italic', 'numberedList', 'bulletedList', 'Spoiler' ],
  } )
  .then( editor => {
      console.log( 'Editor was initialized', editor );

      CKEditorInspector.attach( { 'editor': editor } );

      window.editor = editor;
  } )
  .catch( err => {
      console.error( err.stack );
  } );
